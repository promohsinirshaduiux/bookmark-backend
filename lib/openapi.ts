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
    {
      name: "Bookmarks",
      description: "User bookmarks",
    },
    {
      name: "Tags",
      description: "User bookmark tags",
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
      VerifyRegisterOtpRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          otp: { type: "string", example: "483920" },
        },
      },
      ResendRegisterOtpRequest: {
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
      GoogleAuthRequest: {
        type: "object",
        required: ["idToken"],
        properties: {
          idToken: {
            type: "string",
            example: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
          },
          clientType: {
            type: "string",
            enum: ["web", "extension"],
            example: "web",
          },
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
      RegisterOtpResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: {
            type: "string",
            example: "Registration OTP generated successfully.",
          },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          registerOtp: { type: "string", example: "483920" },
          expiresInMinutes: { type: "number", example: 15 },
        },
      },
      PendingVerificationResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: {
            type: "string",
            example: "Registration is pending verification. Please verify OTP or resend OTP.",
          },
          email: {
            type: "string",
            format: "email",
            example: "john@example.com",
          },
          requiresVerification: { type: "boolean", example: true },
          canResendOtp: { type: "boolean", example: true },
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
          source: { type: "string", example: "system" },
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
            description: "Pass an empty array to clear all system app shortcuts.",
          },
        },
      },
      CreateMyCustomAppShortcutRequest: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", example: "https://example.com" },
          category: { type: "string", example: "Custom" },
          name: { type: "string", example: "My Site" },
          title: { type: "string", example: "My Site" },
          iconUrl: {
            type: "string",
            example: "https://example.com/favicon.ico",
          },
        },
      },
      UpdateMyCustomAppShortcutRequest: {
        type: "object",
        properties: {
          url: { type: "string", example: "https://updated-example.com" },
          title: { type: "string", example: "Updated shortcut title" },
        },
      },
      MyAppShortcutOrderItem: {
        type: "object",
        required: ["id", "source"],
        properties: {
          id: { type: "string", example: "683c44c07bc9fb0f2b9e5701" },
          source: {
            type: "string",
            enum: ["system", "custom"],
            example: "custom",
          },
        },
      },
      ReorderMyAppShortcutsRequest: {
        type: "object",
        required: ["shortcuts"],
        properties: {
          shortcuts: {
            type: "array",
            items: { $ref: "#/components/schemas/MyAppShortcutOrderItem" },
          },
        },
      },
      Bookmark: {
        type: "object",
        properties: {
          id: { type: "string", example: "683c44c07bc9fb0f2b9e5701" },
          url: { type: "string", example: "https://example.com" },
          title: { type: "string", nullable: true, example: "My bookmark" },
          description: {
            type: "string",
            nullable: true,
            example: "What this page is about",
          },
          iconUrl: {
            type: "string",
            nullable: true,
            example: "https://example.com/favicon.ico",
          },
          tags: {
            type: "array",
            items: { $ref: "#/components/schemas/Tag" },
          },
          isArchive: { type: "boolean", example: false },
          order: { type: "number", example: 1000 },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-06-04T10:15:30.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-06-04T10:15:30.000Z",
          },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "number", example: 1 },
          limit: { type: "number", example: 20 },
          total: { type: "number", example: 57 },
          totalPages: { type: "number", example: 3 },
          hasNextPage: { type: "boolean", example: true },
          hasPreviousPage: { type: "boolean", example: false },
        },
      },
      CreateBookmarkRequest: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", example: "https://example.com" },
          title: { type: "string", example: "My bookmark" },
          description: { type: "string", example: "What this page is about" },
          iconUrl: {
            type: "string",
            example: "https://example.com/favicon.ico",
          },
          tagIds: {
            type: "array",
            items: { type: "string" },
            example: ["683c44c07bc9fb0f2b9e5701"],
          },
          isArchive: { type: "boolean", example: false },
        },
      },
      BulkCreateBookmarkItemRequest: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", example: "https://example.com" },
          title: { type: "string", example: "My bookmark" },
          description: { type: "string", example: "What this page is about" },
          iconUrl: {
            type: "string",
            example: "https://example.com/favicon.ico",
          },
          tagIds: {
            type: "array",
            items: { type: "string" },
            example: ["683c44c07bc9fb0f2b9e5701"],
          },
          tagNames: {
            type: "array",
            items: { type: "string" },
            example: ["work", "reference"],
          },
          isArchive: { type: "boolean", example: false },
          createdDate: {
            type: "string",
            format: "date-time",
            example: "2026-06-04T10:15:30.000Z",
          },
        },
      },
      BulkCreateBookmarksRequest: {
        type: "object",
        required: ["bookmarks"],
        properties: {
          bookmarks: {
            type: "array",
            items: { $ref: "#/components/schemas/BulkCreateBookmarkItemRequest" },
          },
        },
      },
      UpdateBookmarkRequest: {
        type: "object",
        properties: {
          url: { type: "string", example: "https://example.com" },
          title: { type: "string", example: "Updated title" },
          description: { type: "string", example: "Updated description" },
          iconUrl: {
            type: "string",
            example: "https://example.com/favicon.ico",
          },
          tagIds: {
            type: "array",
            items: { type: "string" },
            example: ["683c44c07bc9fb0f2b9e5701"],
          },
          isArchive: { type: "boolean", example: true },
        },
      },
      ReorderBookmarksRequest: {
        type: "object",
        required: ["movedBookmarkId"],
        properties: {
          movedBookmarkId: {
            type: "string",
            example: "683c44c07bc9fb0f2b9e5701",
          },
          prevBookmarkId: {
            type: "string",
            nullable: true,
            example: "683c44c07bc9fb0f2b9e5702",
          },
          nextBookmarkId: {
            type: "string",
            nullable: true,
            example: "683c44c07bc9fb0f2b9e5703",
          },
        },
      },
      Tag: {
        type: "object",
        properties: {
          id: { type: "string", example: "683c44c07bc9fb0f2b9e5701" },
          name: { type: "string", example: "code" },
          color: { type: "string", example: "#6366F1" },
          isSystemDefault: { type: "boolean", example: true },
          bookmarkCount: { type: "number", example: 3 },
        },
      },
      CreateTagRequest: {
        type: "object",
        required: ["name", "color"],
        properties: {
          name: { type: "string", example: "backend" },
          color: { type: "string", example: "#22C55E" },
        },
      },
      UpdateTagRequest: {
        type: "object",
        properties: {
          name: { type: "string", example: "reference" },
          color: { type: "string", example: "#8B5CF6" },
        },
      },
      MoveTagBookmarksRequest: {
        type: "object",
        required: ["targetTagId"],
        properties: {
          targetTagId: {
            type: "string",
            example: "683c44c07bc9fb0f2b9e5702",
          },
        },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Start registration by generating OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Registration OTP generated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterOtpResponse" },
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
            description: "Email already exists or verification is pending",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/ErrorResponse" },
                    { $ref: "#/components/schemas/PendingVerificationResponse" },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register/resend-otp": {
      post: {
        tags: ["Auth"],
        summary: "Resend registration OTP for a pending signup",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResendRegisterOtpRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Registration OTP resent successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterOtpResponse" },
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
          "404": {
            description: "Pending registration not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Email already registered",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/register/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Verify registration OTP and create user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyRegisterOtpRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSuccessResponse" },
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
          "404": {
            description: "Pending registration not found",
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
            description: "Validation error or account requires Google login",
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
          "403": {
            description: "Account exists but is not verified yet",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PendingVerificationResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Login or register user with Google",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GoogleAuthRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Google login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSuccessResponse" },
              },
            },
          },
          "400": {
            description: "Validation error or invalid Google token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Email is linked with a different Google account",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout user and clear session cookie",
        responses: {
          "200": {
            description: "Logout successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GenericResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current logged-in user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "User fetched successfully.",
                    },
                    user: { $ref: "#/components/schemas/User" },
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
          "404": {
            description: "User not found",
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
          summary: "Replace the logged-in user's system app shortcuts",
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
              description: "Shortcuts replaced successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: {
                        type: "string",
                        example: "App shortcuts replaced successfully.",
                      },
                      addedCount: { type: "number", example: 1 },
                      removedCount: { type: "number", example: 1 },
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
    "/api/my-app-shortcuts/custom": {
      post: {
        tags: ["My App Shortcuts"],
        summary: "Create a custom shortcut only for the logged-in user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateMyCustomAppShortcutRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Custom shortcut created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example:
                        "Custom app shortcut added to your account successfully.",
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
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Shortcut already exists in user's shortcuts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/my-app-shortcuts/custom/{id}": {
      patch: {
        tags: ["My App Shortcuts"],
        summary: "Update a custom shortcut for the logged-in user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateMyCustomAppShortcutRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Custom shortcut updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Custom app shortcut updated successfully.",
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
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Custom shortcut not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Duplicate shortcut",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["My App Shortcuts"],
        summary: "Delete a custom shortcut for the logged-in user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Custom shortcut deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Custom app shortcut deleted successfully.",
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
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Custom shortcut not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/my-app-shortcuts/order": {
      patch: {
        tags: ["My App Shortcuts"],
        summary: "Persist a new order for the logged-in user's app shortcuts",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ReorderMyAppShortcutsRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Shortcut order updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "App shortcut order updated successfully.",
                    },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AppShortcut" },
                    },
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
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/bookmarks": {
      get: {
        tags: ["Bookmarks"],
        summary: "Get all bookmarks for the logged-in user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Bookmarks fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmarks fetched successfully.",
                    },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Bookmark" },
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
      delete: {
        tags: ["Bookmarks"],
        summary: "Delete all bookmarks for the logged-in user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "isArchive",
            in: "query",
            required: false,
            schema: { type: "boolean" },
            description:
              "Optional filter to delete only archived or only active bookmarks.",
          },
        ],
        responses: {
          "200": {
            description: "Bookmarks deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmarks deleted successfully.",
                    },
                    deletedCount: { type: "number", example: 12 },
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
        tags: ["Bookmarks"],
        summary: "Add a bookmark for the logged-in user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBookmarkRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Bookmark created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmark added successfully.",
                    },
                    data: { $ref: "#/components/schemas/Bookmark" },
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
          "409": {
            description: "Duplicate bookmark",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/bookmarks/paginated": {
      get: {
        tags: ["Bookmarks"],
        summary: "Get paginated bookmarks for the logged-in user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "number", example: 1 },
            description: "Page number. Defaults to 1.",
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "number", example: 20 },
            description: "Items per page. Defaults to 20 and max is 100.",
          },
          {
            name: "isArchive",
            in: "query",
            required: false,
            schema: { type: "boolean" },
            description: "Optional filter for archived or active bookmarks.",
          },
          {
            name: "tagId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Optional tag ID filter.",
          },
        ],
        responses: {
          "200": {
            description: "Paginated bookmarks fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmarks fetched successfully.",
                    },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Bookmark" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
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
        },
      },
    },
    "/api/bookmarks/search": {
      get: {
        tags: ["Bookmarks"],
        summary: "Search bookmarks for the logged-in user",
        security: [{ bearerAuth: [] }],
        parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string", example: "youtube" },
              description: "Search term for bookmark url, title, description, or tag name.",
            },
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "number", example: 1 },
            description: "Page number. Defaults to 1.",
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "number", example: 20 },
            description: "Items per page. Defaults to 20 and max is 100.",
          },
          {
            name: "isArchive",
            in: "query",
            required: false,
            schema: { type: "boolean" },
            description: "Optional filter for archived or active bookmarks.",
          },
          {
            name: "tagId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Optional tag ID filter.",
          },
        ],
        responses: {
          "200": {
            description: "Bookmarks search completed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmarks search completed successfully.",
                    },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Bookmark" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
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
        },
      },
    },
    "/api/bookmarks/bulk": {
      post: {
        tags: ["Bookmarks"],
        summary: "Import bookmarks in bulk for the logged-in user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BulkCreateBookmarksRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Bookmarks imported successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmarks imported successfully.",
                    },
                    createdCount: { type: "number", example: 8 },
                    skippedCount: { type: "number", example: 2 },
                    skipped: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          url: {
                            type: "string",
                            nullable: true,
                            example: "https://example.com",
                          },
                          reason: {
                            type: "string",
                            example: "This URL already exists in your bookmarks.",
                          },
                        },
                      },
                    },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Bookmark" },
                    },
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
            description: "Tag not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/bookmarks/reorder": {
      patch: {
        tags: ["Bookmarks"],
        summary: "Reorder bookmarks for the logged-in user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReorderBookmarksRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Bookmark reordered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmark reordered successfully.",
                    },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", example: "683c44c07bc9fb0f2b9e5701" },
                        order: { type: "number", example: 21500 },
                        rebalanced: { type: "boolean", example: false },
                      },
                    },
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
            description: "Bookmark not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/bookmarks/{id}": {
      patch: {
        tags: ["Bookmarks"],
        summary: "Update a bookmark for the logged-in user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateBookmarkRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Bookmark updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmark updated successfully.",
                    },
                    data: { $ref: "#/components/schemas/Bookmark" },
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
            description: "Bookmark not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Duplicate bookmark",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Bookmarks"],
        summary: "Delete a bookmark for the logged-in user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Bookmark deleted successfully",
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
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Bookmark not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/bookmarks/tags": {
      delete: {
        tags: ["Bookmarks"],
        summary: "Remove all tag assignments from the logged-in user's bookmarks",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "isArchive",
            in: "query",
            required: false,
            schema: { type: "boolean" },
            description:
              "Optional filter to remove tags only from archived or only from active bookmarks.",
          },
        ],
        responses: {
          "200": {
            description: "Bookmark tags removed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Tags removed from bookmarks successfully.",
                    },
                    updatedCount: { type: "number", example: 12 },
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
    "/api/tags": {
      get: {
        tags: ["Tags"],
        summary: "Get all tags for the logged-in user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Tags fetched successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Tags fetched successfully.",
                    },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Tag" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tags"],
        summary: "Create a new tag for the logged-in user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTagRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Tag created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Tag created successfully.",
                    },
                    data: { $ref: "#/components/schemas/Tag" },
                  },
                },
              },
            },
          },
          "409": {
            description: "Duplicate tag",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/tags/custom": {
      delete: {
        tags: ["Tags"],
        summary: "Delete all custom tags for the logged-in user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Custom tags deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Custom tags deleted successfully.",
                    },
                    deletedCount: { type: "number", example: 5 },
                    updatedBookmarkCount: { type: "number", example: 12 },
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
    "/api/tags/{id}": {
      patch: {
        tags: ["Tags"],
        summary: "Rename a tag or change its color",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTagRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Tag updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Tag updated successfully.",
                    },
                    data: { $ref: "#/components/schemas/Tag" },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Tags"],
        summary: "Delete a tag and remove it from bookmarks",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Tag deleted successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GenericResponse" },
              },
            },
          },
        },
      },
    },
    "/api/tags/{id}/move-bookmarks": {
      post: {
        tags: ["Tags"],
        summary: "Move bookmarks from one tag to another",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MoveTagBookmarksRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Bookmarks moved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmarks moved to the target tag successfully.",
                    },
                    updatedCount: { type: "number", example: 4 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/tags/{id}/bookmarks": {
      delete: {
        tags: ["Tags"],
        summary: "Delete all bookmarks under a tag",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Bookmarks deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Bookmarks under this tag deleted successfully.",
                    },
                    deletedCount: { type: "number", example: 3 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
