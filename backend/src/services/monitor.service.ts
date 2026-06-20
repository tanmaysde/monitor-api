import axios,{AxiosError,Method} from "axios";

export const checkMonitor = async (url:string,method:string) =>{
  const start = Date.now();

  try {
    const response = await axios({
      url,
      method:method as Method,
      timeout:10000,
      validateStatus:()=>true,
    })

    const responseTime = Date.now() - start;
    const isUp = response.status >= 200 && response.status < 400;

    return {
      status:isUp ? "UP" as const : "DOWN" as const,
      responseTime,
      statusCode: response.status,
      checkedAt:new Date(),
      errorMessage: isUp ? undefined : `HTTP ${response.status}`
    }
  } catch (error) {
    const AxiosError = error as AxiosError;
    return {
      status:"DOWN" as const,
      responseTime:Date.now() - start,
      statusCode:AxiosError.response?.status,
      checkedAt:new Date(),
      errorMessage:AxiosError.message,
    }
  }
}