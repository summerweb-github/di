type LogFn = (...data: unknown[]) => void;

export const Logger = {
  log: ((..._data: unknown[]) => undefined) as LogFn,
  setLogger(logger: LogFn) {
    Logger.log = logger;
  },
};
