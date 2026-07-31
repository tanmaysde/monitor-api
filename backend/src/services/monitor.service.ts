import axios,{AxiosError,Method} from "axios";
import net from "net";
import dns from "dns";
import { exec } from "child_process";
import { URL } from "url";
import { runAssertions } from "./assertion.service";

const getHostname = (target: string): string => {
  try {
    if (!target.includes("://")) {
      target = "http://" + target; // dummy protocol parsing protection
    }
    return new URL(target).hostname;
  } catch {
    return target; // Fallback to raw string
  }
};

export const checkTcp = (targetUrl: string, port: number): Promise<any> => {
  return new Promise((resolve) => {
    const start = Date.now();
    const host = getHostname(targetUrl);
    const socket = new net.Socket();
    socket.setTimeout(5000); // 5 seconds wait timeout
    socket.connect(port, host, () => {
      const responseTime = Date.now() - start;
      socket.destroy(); // Socket successful connection. Close raw connection immediately.
      resolve({ status: "UP", responseTime });
    });
    socket.on("error", (err) => {
      const responseTime = Date.now() - start;
      socket.destroy();
      resolve({ status: "DOWN", responseTime, errorMessage: err.message });
    });
    socket.on("timeout", () => {
      const responseTime = Date.now() - start;
      socket.destroy();
      resolve({ status: "DOWN", responseTime, errorMessage: "TCP Connection Timed Out (5s)" });
    });
  });
};

export const checkDns = async (targetUrl: string, recordType: string = "A"): Promise<any> => {
  const start = Date.now();
  const host = getHostname(targetUrl);
  try {
    const resolver = new dns.promises.Resolver();
    let records: any = [];
    switch (recordType) {
      case "AAAA":
        records = await resolver.resolve6(host);
        break;
      case "CNAME":
        records = await resolver.resolveCname(host);
        break;
      case "MX":
        records = await resolver.resolveMx(host);
        break;
      case "TXT":
        records = await resolver.resolveTxt(host);
        break;
      case "A":
      default:
        records = await resolver.resolve4(host);
        break;
    }
    return {
      status: "UP",
      responseTime: Date.now() - start,
      dnsRecords: records,
    };
  } catch (err: any) {
    return {
      status: "DOWN",
      responseTime: Date.now() - start,
      errorMessage: err.message,
    };
  }
};

export const checkPing = (targetUrl: string): Promise<any> => {
  return new Promise((resolve) => {
    const start = Date.now();
    const host = getHostname(targetUrl);
    const isWindows = process.platform === "win32";
    
    // Windows requires "-n 1" while Unix system requires "-c 1" count
    const cmd = isWindows ? `ping -n 1 ${host}` : `ping -c 1 ${host}`;
    exec(cmd, (error, stdout, stderr) => {
      const responseTime = Date.now() - start;
      if (error) {
        resolve({
          status: "DOWN",
          responseTime,
          errorMessage: error.message || stderr || "Ping request failed",
        });
      } else {
        resolve({
          status: "UP",
          responseTime,
        });
      }
    });
  });
};

export const checkHttp = async (url: string, method: string): Promise<any> => {
  const start = Date.now();
  try {
    const response = await axios({
      url,
      method: method as Method,
      timeout: 10000,
      validateStatus: () => true, // Allows our assertions checker to process HTTP statuses manually
      maxRedirects: 0,
    });
    const responseTime = Date.now() - start;
    const isUp = response.status >= 200 && response.status < 400;
    return {
      status: isUp ? "UP" : "DOWN",
      responseTime,
      statusCode: response.status,
      checkedAt: new Date(),
      errorMessage: isUp ? undefined : `HTTP ${response.status}`,
      body: typeof response.data === "object" ? JSON.stringify(response.data) : response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    return {
      status: "DOWN",
      responseTime: Date.now() - start,
      statusCode: axiosError.response?.status,
      checkedAt: new Date(),
      errorMessage: axiosError.message,
      body: axiosError.response?.data,
    };
  }
};

export const checkMonitor = async (monitor: any): Promise<any> => {
  const type = monitor.type || "HTTP";
  let result: any;
  
  switch (type) {
    case "TCP":
      result = await checkTcp(monitor.url, monitor.port || 80);
      break;
    case "DNS":
      result = await checkDns(monitor.url, monitor.dnsRecordType || "A");
      break;
    case "PING":
      result = await checkPing(monitor.url);
      break;
    case "HTTP":
    default:
      result = await checkHttp(monitor.url, monitor.method || "GET");
      break;
  }

  const assertionOutcome = runAssertions(monitor.assertions || [], result);
  return {
    ...result,
    status: assertionOutcome.isUp ? "UP" : "DOWN",
    errorMessage: assertionOutcome.failedReason || result.errorMessage,
    assertionResults: assertionOutcome.results, // Saved output rules log list
  };

};