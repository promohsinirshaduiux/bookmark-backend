export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Bookmark Backend API",
    version: "1.0.0",
    description: "Authentication APIs for bookmark backend.",
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000",
      description: "API server",
    },
  ],
  tags: [
    {
      name: "Auth",
      description: "Authentication endpoints",
    },
    {
      name: "App Shortcuts",
      description: "System-level app shortcuts",
    },
    {
      name: "My App Shortcuts",
      description: "User-linked app shortcuts",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "John Doe" },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          password: { type: "string", format: "password", example: "pass1234" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          password: { type: "string", format: "password", example: "pass1234" },
        },
      },
      ForgotRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["email", "otp", "newPassword"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          otp: { type: "string", example: "483920" },
          newPassword: {
            type: "string",
            format: "password",
            example: "newpass1234",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "683c44c07bc9fb0f2b9e5701" },
          name: { type: "string", example: "John Doe" },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
        },
      },
      AuthSuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Login successful." },
          token: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      GenericResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation completed." },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Invalid credentials." },
        },
      },
      AppShortcut: {
        type: "object",
        properties: {
          id: { type: "string", example: "683c44c07bc9fb0f2b9e5701" },
          url: { type: "string", example: "https://www.youtube.com" },
          category: { type: "string", example: "Social & Community" },
          name: { type: "string", nullable: true, example: "YouTube" },
          title: { type: "string", nullable: true, example: "YouTube" },
          iconUrl: {
            type: "string",
            nullable: true,
            example: "https://www.youtube.com/favicon.ico",
          },
        },
      },
      CreateAppShortcutRequest: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", example: "https://www.youtube.com" },
          category: { type: "string", example: "Social & Community" },
          name: { type: "string", example: "YouTube" },
          title: { type: "string", example: "YouTube" },
          iconUrl: {
            type: "string",
            example: "https://www.youtube.com/favicon.ico",
          },
        },
      },
      AttachMyAppShortcutsRequest: {
        type: "object",
        properties: {
          appShortcutId: {
            type: "string",
            example: "683c44c07bc9fb0f2b9e5701",
          },
          appShortcutIds: {
            type: "array",
            items: { type: "string" },
            example: ["683c44c07bc9fb0f2b9e5701", "683c44c07bc9fb0f2b9e5702"],
          },
        },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "User registered",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Email already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/forgot": {
      post: {
        tags: ["Auth"],
        summary: "Start forgot-password flow",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ForgotRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Generic response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GenericResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using email and OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GenericResponse" },
              },
            },
          },
          "400": {
            description: "Invalid OTP or validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/app-shortcuts": {
      get: {
        tags: ["App Shortcuts"],
        summary: "Get all system app shortcuts",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Shortcut list fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AppShortcut" },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["App Shortcuts"],
        summary: "Add a system app shortcut",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAppShortcutRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Shortcut created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "App shortcut added successfully.",
                    },
                    data: { $ref: "#/components/schemas/AppShortcut" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "URL already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/app-shortcuts/sync-defaults": {
      post: {
        tags: ["App Shortcuts"],
        summary: "Sync missing default app shortcuts",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Sync completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Default app shortcuts sync completed.",
                    },
                    insertedCount: { type: "number", example: 120 },
                    matchedCount: { type: "number", example: 30 },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/my-app-shortcuts": {
      get: {
        tags: ["My App Shortcuts"],
        summary: "Get shortcuts attached to logged-in user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "My shortcuts fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AppShortcut" },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["My App Shortcuts"],
        summary: "Attach one or more app shortcuts to logged-in user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AttachMyAppShortcutsRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Shortcuts attached successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "App shortcuts attached to user successfully.",
                    },
                    attachedCount: { type: "number", example: 2 },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "User or shortcut not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
} as const;
