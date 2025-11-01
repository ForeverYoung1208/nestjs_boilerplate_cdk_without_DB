export type MockType<T> = { [key in keyof Partial<T>]: any };
