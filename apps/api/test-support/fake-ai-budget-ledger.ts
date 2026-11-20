import { AiBudgetUnavailableError, AiEvaluationInProgressError, estimateAiCallCostMicroUsd, parseGatewayCostUsd, type AiBudgetRunner, type AiBudgetSummary } from "../src/adapters/ai/budget-ledger.js";

type State = "reserved" | "settled" | "released" | "uncertain";

/** Provider unit tests isolate generation behavior; PostgreSQL ledger behavior has integration tests of its own. */
export class FakeAiBudgetLedger implements AiBudgetRunner {
  private readonly operations = new Map<string, { state: State; reserved: number; actual: number }>();

  seedUncertain(operationKey: string, reservedMicroUsd: number): void {
    this.operations.set(operationKey, { state: "uncertain", reserved: reservedMicroUsd, actual: 0 });
  }

  async run<T>(input: Parameters<AiBudgetRunner["run"]>[0]): Promise<T> {
    const reserved = estimateAiCallCostMicroUsd({ inputTokens: input.inputTokens, outputTokens: input.outputTokens, ...(input.rates ? { rates: input.rates } : {}) });
    const prior = this.operations.get(input.operationKey);
    if (prior && prior.state !== "released") throw new AiEvaluationInProgressError();
    const operation = { state: "reserved" as State, reserved, actual: 0 };
    this.operations.set(input.operationKey, operation);
    try {
      const receipt = await input.invoke();
      await input.onReceipt?.(receipt.value);
      const cost = parseGatewayCostUsd(receipt.costUsd);
      if (cost === undefined) {
        operation.state = "uncertain";
        throw new AiBudgetUnavailableError("El proveedor no confirmó el costo de la solicitud.");
      }
      operation.state = "settled";
      operation.actual = Math.ceil(cost * 1_000_000);
      return receipt.value;
    } catch (error) {
      if (operation.state === "reserved") operation.state = input.isConfirmedNoCharge?.(error) ? "released" : "uncertain";
      throw error;
    }
  }

  summary(): AiBudgetSummary {
    let settledMicroUsd = 0; let reservedMicroUsd = 0; let uncertainMicroUsd = 0;
    for (const operation of this.operations.values()) {
      if (operation.state === "settled") settledMicroUsd += operation.actual;
      if (operation.state === "reserved") reservedMicroUsd += operation.reserved;
      if (operation.state === "uncertain") uncertainMicroUsd += operation.reserved;
    }
    return { settledMicroUsd, reservedMicroUsd, uncertainMicroUsd };
  }
}
