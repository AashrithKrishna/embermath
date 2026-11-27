// Minimal ambient types for the Desmos Graphing Calculator API v1.9, loaded
// lazily from https://www.desmos.com/api/v1.9/calculator.js.
export {}

declare global {
  interface DesmosExpressionState {
    id: string
    latex: string
    color?: string
    hidden?: boolean
  }

  interface DesmosCalculator {
    setExpression(state: DesmosExpressionState): void
    setExpressions(states: DesmosExpressionState[]): void
    removeExpression(state: { id: string }): void
    resize(): void
    destroy(): void
  }

  interface DesmosColors {
    RED: string
    BLUE: string
    GREEN: string
    PURPLE: string
    ORANGE: string
    BLACK: string
  }

  interface Window {
    Desmos?: {
      GraphingCalculator: new (
        element: HTMLElement,
        options?: Record<string, unknown>,
      ) => DesmosCalculator
      Colors: DesmosColors
    }
  }
}
