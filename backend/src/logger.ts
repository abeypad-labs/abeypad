type Meta = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, meta?: Meta) {
  const line = { level, message, time: new Date().toISOString(), ...meta };
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
    JSON.stringify(line),
  );
}

export const logger = {
  info: (message: string, meta?: Meta) => write("info", message, meta),
  warn: (message: string, meta?: Meta) => write("warn", message, meta),
  error: (message: string, meta?: Meta) => write("error", message, meta),
};

