/**
 * OpenAPI 3 spec for the checkout-service, served as interactive docs at /docs.
 * Kept in sync by hand with the routes in src/routes/ — it is small on purpose.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'checkout-service',
    version: '1.0.0',
    description:
      'Checkout/orders service. Money is integer **cents**. State is in-memory and ' +
      'reseeded on restart.\n\n' +
      '**Seed products:** `BOOK` 1500¢/25 · `PEN` 250¢/100 · `MUG` 900¢/4\n\n' +
      '**Seed coupons:** `SAVE10` (10% off, min 2000¢) · `WELCOME200` (200¢ off, min 1000¢) · `EXPIRED`',
  },
  servers: [{ url: '/' }],
  paths: {
    '/health': {
      get: {
        summary: 'Liveness check',
        tags: ['meta'],
        responses: {
          '200': {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } },
              },
            },
          },
        },
      },
    },
    '/products': {
      get: {
        summary: 'List products with current stock',
        tags: ['products'],
        responses: {
          '200': {
            description: 'All products',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { products: { type: 'array', items: { $ref: '#/components/schemas/Product' } } },
                },
              },
            },
          },
        },
      },
    },
    '/orders/checkout': {
      post: {
        summary: 'Check out a cart',
        description:
          'Prices the cart, applies an optional coupon, reserves stock, and persists an order.\n\n' +
          'Supply an **Idempotency-Key** header to make retries safe: the same key with the ' +
          'same cart returns the original order (stock decremented once); the same key with a ' +
          '*different* cart is rejected with 409.',
        tags: ['orders'],
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Optional. Makes the checkout idempotent for safe retries.',
            example: 'demo-key-1',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckoutInput' },
              examples: {
                basic: { summary: 'Basic cart', value: { lines: [{ sku: 'BOOK', quantity: 2 }] } },
                withCoupon: {
                  summary: 'With a coupon',
                  value: { lines: [{ sku: 'BOOK', quantity: 2 }], couponCode: 'SAVE10' },
                },
                insufficient: {
                  summary: 'Triggers 409 (MUG stock is 4)',
                  value: { lines: [{ sku: 'MUG', quantity: 99 }] },
                },
                unknownSku: {
                  summary: 'Triggers 404',
                  value: { lines: [{ sku: 'GHOST', quantity: 1 }] },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } },
          },
          '400': {
            description: 'Invalid request (e.g. non-positive quantity)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Unknown SKU',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '409': {
            description: 'Insufficient stock, or idempotency key reused with a different request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: 'object',
        properties: {
          sku: { type: 'string', example: 'BOOK' },
          name: { type: 'string', example: 'Paperback' },
          priceCents: { type: 'integer', example: 1500 },
          stock: { type: 'integer', example: 25 },
        },
      },
      CartLine: {
        type: 'object',
        required: ['sku', 'quantity'],
        properties: {
          sku: { type: 'string', example: 'BOOK' },
          quantity: { type: 'integer', minimum: 1, example: 2 },
        },
      },
      CheckoutInput: {
        type: 'object',
        required: ['lines'],
        properties: {
          lines: { type: 'array', items: { $ref: '#/components/schemas/CartLine' } },
          couponCode: { type: 'string', nullable: true, example: 'SAVE10' },
        },
      },
      PriceBreakdown: {
        type: 'object',
        properties: {
          subtotalCents: { type: 'integer', example: 3000 },
          discountCents: { type: 'integer', example: 300 },
          taxCents: { type: 'integer', example: 189 },
          totalCents: { type: 'integer', example: 2889 },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          lines: { type: 'array', items: { $ref: '#/components/schemas/CartLine' } },
          breakdown: { $ref: '#/components/schemas/PriceBreakdown' },
          couponCode: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string', example: 'insufficient stock for MUG' } },
      },
    },
  },
} as const;
