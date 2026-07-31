import { IAssertion } from "../types/monitor.types";

const getValueByPath = (obj: any, path: string): any => {
  // Strip off the starting symbol if formatted as JSONPath (e.g. $.status -> status)
  const cleanPath = path.startsWith("$.") ? path.slice(2) : path;
  if (!cleanPath) return obj;
  
  return cleanPath.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      // Array index parser matching key name + index (e.g. "users[2]")
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const key = arrayMatch[1];
        const idx = parseInt(arrayMatch[2], 10);
        return acc[key]?.[idx];
      }
      return acc[part]; // Normal property retrieval
    }
    return undefined;
  }, obj);
};

// Operator comparison matching rules
const evaluateOperator = (actual: any, operator: string, expected: string): boolean => {
  if (actual === undefined || actual === null) return false;
  
  const actualStr = String(actual);
  const expectedStr = String(expected);
  
  switch (operator) {
    case "EQUALS":
      return actualStr === expectedStr;
    case "NOT_EQUALS":
      return actualStr !== expectedStr;
    case "CONTAINS":
      return actualStr.toLowerCase().includes(expectedStr.toLowerCase());
    case "NOT_CONTAINS":
      return !actualStr.toLowerCase().includes(expectedStr.toLowerCase());
    case "GREATER_THAN":
      const actualNum = parseFloat(actual);
      const expectedNum = parseFloat(expected);
      return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum > expectedNum;
    case "LESS_THAN":
      const actNum = parseFloat(actual);
      const expNum = parseFloat(expected);
      return !isNaN(actNum) && !isNaN(expNum) && actNum < expNum;
    default:
      return false;
  }
};

export const runAssertions = (
  assertions: IAssertion[],
  result: any
): { isUp: boolean; failedReason?: string; results: any[] } => {
  // If no assertions exist, return original check outcome
  if (!assertions || assertions.length === 0) {
    return { isUp: result.status === "UP", results: [] };
  }
  const assertionResults = [];
  let isUp = true;
  let failedReason: string | undefined = undefined;
  for (const assertion of assertions) {
    let actualValue: any = undefined;
    switch (assertion.type) {
      case "STATUS_CODE":
        actualValue = result.statusCode;
        break;
      case "RESPONSE_TIME":
        actualValue = result.responseTime;
        break;
      case "TEXT_BODY":
        actualValue = result.body || (result.dnsRecords ? JSON.stringify(result.dnsRecords) : "");
        break;
      case "JSON_PATH":
        try {
          const parsedJson = typeof result.body === "string" ? JSON.parse(result.body) : result.body;
          actualValue = getValueByPath(parsedJson, assertion.target || "");
        } catch {
          actualValue = undefined;
        }
        break;
    }
    const passed = evaluateOperator(actualValue, assertion.operator, assertion.value);
    
    assertionResults.push({
      assertion,
      passed,
      actualValue,
    });
    if (!passed) {
      isUp = false;
      if (!failedReason) {
        failedReason = `Assertion failed: ${assertion.type} ${assertion.operator} ${assertion.value} (Actual: ${actualValue})`;
      }
    }
  }
  // If the network protocol check failed initially (e.g. host unreachable), keep status DOWN
  if (result.status === "DOWN" && isUp) {
    isUp = false;
    failedReason = result.errorMessage || "Network check failed";
  }
  return {
    isUp,
    failedReason,
    results: assertionResults,
  };
};