import { v4Template } from "./templates/empty.js";
import { loginFormTemplate } from "./templates/loginForm.js";
import { dashboardTemplate } from "./templates/dashboard.js";

export interface TemplateInfo {
  id: string;
  label: string;
  description: string;
}

export function getTemplates(): TemplateInfo[] {
  return [
    {
      id: "empty",
      label: "Empty Page",
      description: "A blank canvas with a root container",
    },
    {
      id: "login-form",
      label: "Login Form",
      description: "A login form with email, password, and submit button",
    },
    {
      id: "dashboard",
      label: "Dashboard",
      description: "A dashboard layout with sidebar and content area",
    },
  ];
}

export function getTemplateContent(
  templateId: string,
  componentName: string,
): string {
  switch (templateId) {
    case "login-form":
      return loginFormTemplate(componentName);
    case "dashboard":
      return dashboardTemplate(componentName);
    case "empty":
    default:
      return v4Template(componentName);
  }
}
