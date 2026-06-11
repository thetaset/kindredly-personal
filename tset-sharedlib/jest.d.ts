declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function expect<T>(actual: T): jest.Matchers<T>;
declare namespace jest {
  interface Matchers<R> {
    toBe(expected: any): R;
    toBeNull(): R;
    toBeFalsy(): R;
    toBeTruthy(): R;
    toEqual(expected: any): R;
    toMatch(expected: string | RegExp): R;
    toThrow(expected?: string | Error | RegExp): R;
  }
}
