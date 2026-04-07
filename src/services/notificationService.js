import { toast as toastify } from "react-toastify";

const defaultToastOptions = {
  position: "bottom-right",
  autoClose: 3500,
  theme: "colored",
  rtl: true,
};

const withDefaults = (options = {}) => ({
  ...defaultToastOptions,
  ...options,
});

export const toast = {
  success: (message, options) => toastify.success(message, withDefaults(options)),
  error: (message, options) => toastify.error(message, withDefaults(options)),
  info: (message, options) => toastify.info(message, withDefaults(options)),
  warn: (message, options) => toastify.warn(message, withDefaults(options)),
  warning: (message, options) => toastify.warn(message, withDefaults(options)),
  dismiss: toastify.dismiss,
  promise: toastify.promise,
};

