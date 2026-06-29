// Auto-generated data-driven IA sidebar tree consumed by defineDocsConfig.
import type { SidebarSection } from "frappe-ui/vitepress";

export const sidebar: SidebarSection[] = [
  {
    text: "Getting Started",
    items: [
      { text: "Introduction", link: "/getting-started/introduction" },
      { text: "Architecture", link: "/getting-started/architecture" },
      { text: "Prerequisites", link: "/getting-started/prerequisites" },
      { text: "Installation", link: "/getting-started/installation" },
      { text: "Your First App", link: "/getting-started/your-first-app" },
      { text: "Your First Site", link: "/getting-started/your-first-site" },
      { text: "Key Concepts", link: "/getting-started/key-concepts" },
    ],
  },
  {
    text: "Tutorial (Build an App)",
    items: [
      { text: "Setup", link: "/tutorial/setup" },
      { text: "Developer Mode", link: "/tutorial/developer-mode" },
      { text: "Create the DocType", link: "/tutorial/create-the-doctype" },
      {
        text: "Controllers & Business Logic",
        link: "/tutorial/controllers-and-business-logic",
      },
      { text: "Form Scripts", link: "/tutorial/form-scripts" },
      {
        text: "Permissions and Roles",
        link: "/tutorial/permissions-and-roles",
      },
      { text: "Reports And Print", link: "/tutorial/reports-and-print" },
      { text: "Whats Next", link: "/tutorial/whats-next" },
    ],
  },
  {
    text: "DocTypes & Data Model",
    items: [
      { text: "Overview", link: "/doctypes/overview" },
      { text: "Fields", link: "/doctypes/fields" },
      { text: "Naming", link: "/doctypes/naming" },
      { text: "Child Tables", link: "/doctypes/child-tables" },
      { text: "Single DocTypes", link: "/doctypes/single-doctypes" },
      { text: "Virtual DocTypes", link: "/doctypes/virtual-doctypes" },
      {
        text: "Controllers & Lifecycle",
        link: "/doctypes/controllers-lifecycle",
      },
      { text: "Docstatus", link: "/doctypes/docstatus" },
      { text: "Links & Actions", link: "/doctypes/links-actions" },
      { text: "Customization", link: "/doctypes/customization" },
      {
        text: "Modules & App Structure",
        link: "/doctypes/modules-app-structure",
      },
      { text: "Layout View Settings", link: "/doctypes/layout-view-settings" },
      {
        text: "Data Masking Audit Trail",
        link: "/doctypes/data-masking-audit-trail",
      },
    ],
  },
  {
    text: "Server-Side (Python API)",
    items: [
      { text: "Overview", link: "/server-side/overview" },
      { text: "Document API", link: "/server-side/document-api" },
      { text: "Querying Data", link: "/server-side/querying-data" },
      { text: "Query Builder", link: "/server-side/query-builder" },
      { text: "Database API", link: "/server-side/database-api" },
      { text: "Whitelisted Methods", link: "/server-side/whitelisted-methods" },
      { text: "Hooks", link: "/server-side/hooks" },
      { text: "Permissions in Code", link: "/server-side/permissions-in-code" },
      { text: "Background Jobs", link: "/server-side/background-jobs" },
      { text: "Realtime", link: "/server-side/realtime" },
      { text: "Jinja SSR", link: "/server-side/jinja-ssr" },
      { text: "Caching", link: "/server-side/caching" },
      { text: "Logging Errors", link: "/server-side/logging-errors" },
      { text: "Utilities", link: "/server-side/utilities" },
    ],
  },
  {
    text: "REST API & Integrations",
    items: [
      { text: "Overview", link: "/rest-api/overview" },
      { text: "Authentication", link: "/rest-api/authentication" },
      { text: "Listing Documents", link: "/rest-api/listing-documents" },
      {
        text: "Creating, Updating & Deleting",
        link: "/rest-api/creating-updating",
      },
      { text: "Calling Methods", link: "/rest-api/calling-methods" },
      {
        text: "Filters, Fields & Pagination",
        link: "/rest-api/filters-fields-pagination",
      },
      { text: "Webhooks", link: "/rest-api/webhooks" },
      { text: "Connected Apps", link: "/rest-api/connected-apps" },
      {
        text: "Third Party Integrations",
        link: "/rest-api/third-party-integrations",
      },
      { text: "Rate Limiting", link: "/rest-api/rate-limiting" },
    ],
  },
  {
    text: "Client-Side (JS API)",
    items: [
      { text: "Form API", link: "/client-side/form-api" },
      { text: "Controls", link: "/client-side/controls" },
      { text: "Server Calls", link: "/client-side/server-calls" },
      { text: "List View", link: "/client-side/list-view" },
      { text: "Dialog API", link: "/client-side/dialog-api" },
      { text: "Charts, Barcode & QR", link: "/client-side/charts-scanner" },
      { text: "Custom Pages", link: "/client-side/custom-pages" },
      { text: "Tree View", link: "/client-side/tree-view" },
      { text: "Asset Bundling", link: "/client-side/asset-bundling" },
      { text: "Common Utilities", link: "/client-side/common-utilities" },
    ],
  },
  {
    text: "Desk & UI",
    items: [
      { text: "Overview", link: "/desk/overview" },
      { text: "Reports", link: "/desk/reports" },
      { text: "Print Formats", link: "/desk/print-formats" },
      { text: "Client Server Scripts", link: "/desk/client-server-scripts" },
      { text: "Attachments", link: "/desk/attachments" },
      { text: "System Console", link: "/desk/system-console" },
    ],
  },
  {
    text: "Portal & Web Forms",
    items: [
      { text: "Portal Pages", link: "/portal/portal-pages" },
      { text: "Generators Routing", link: "/portal/generators-routing" },
      { text: "Web Forms", link: "/portal/web-forms" },
      {
        text: "Portal Roles and Redirects",
        link: "/portal/portal-roles-redirects",
      },
    ],
  },
  {
    text: "Security, Auth & Permissions",
    items: [
      { text: "Permission Model", link: "/security/permission-model" },
      { text: "User Role Management", link: "/security/user-role-management" },
      {
        text: "Permission Query Conditions",
        link: "/security/permission-query-conditions",
      },
      { text: "Document Sharing", link: "/security/document-sharing" },
      { text: "User Permissions", link: "/security/user-permissions" },
      { text: "Audit Trail", link: "/security/audit-trail" },
      { text: "OAuth2", link: "/rest-api/oauth2" },
      { text: "Social Login OIDC", link: "/rest-api/social-login-oidc" },
      { text: "LDAP & Active Directory", link: "/rest-api/ldap" },
      {
        text: "Security Best Practices",
        link: "/security/security-best-practices",
      },
    ],
  },
  {
    text: "App Lifecycle & Tooling",
    items: [
      { text: "Migrations & Patches", link: "/server-side/migrations-patches" },
      { text: "Translations", link: "/server-side/translations" },
      {
        text: "Custom Bench Commands",
        link: "/server-side/custom-bench-commands",
      },
    ],
  },
  {
    text: "Administration & Deployment",
    items: [
      { text: "Bench Overview", link: "/administration/bench-overview" },
      { text: "Site Management", link: "/administration/site-management" },
      { text: "Site Config", link: "/administration/site-config" },
      { text: "Production Setup", link: "/administration/production-setup" },
      { text: "HTTPS", link: "/administration/https" },
      {
        text: "Multitenancy Domains",
        link: "/administration/multitenancy-domains",
      },
      {
        text: "Database Administration",
        link: "/administration/database-administration",
      },
      {
        text: "Zero Downtime Migrations",
        link: "/administration/zero-downtime-migrations",
      },
      { text: "Monitoring", link: "/administration/monitoring" },
      {
        text: "Performance Optimization",
        link: "/administration/performance-optimization",
      },
    ],
  },
  {
    text: "Testing & Quality",
    items: [
      { text: "Overview", link: "/testing/overview" },
      { text: "Unit Testing", link: "/testing/unit-testing" },
      { text: "Integration Testing", link: "/testing/integration-testing" },
      { text: "UI Testing", link: "/testing/ui-testing" },
      { text: "Debugging", link: "/testing/debugging" },
      {
        text: "Profiling and Monitoring",
        link: "/testing/profiling-monitoring",
      },
    ],
  },
  {
    text: "Data Import / Export",
    items: [
      { text: "Data Import", link: "/data-import/data-import" },
      { text: "Large CSV Import", link: "/data-import/large-csv-import" },
      {
        text: "Moving Data Between Sites",
        link: "/data-import/moving-data-between-sites",
      },
    ],
  },
];
