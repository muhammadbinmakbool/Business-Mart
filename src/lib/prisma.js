import { PrismaClient } from "@prisma/client";
import { getSession } from "./session";
import { SYSTEM_BUSINESS_ID } from "./constants";

const globalForPrisma = global;

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

// Models that have userId and businessId ownership fields
const MODELS_WITH_OWNERSHIP = [
  "party",
  "product",
  "intakeTransaction",
  "intakeAdvance",
  "saleTransaction",
  "saleItem",
  "salesTrack",
  "transactionAdjustment",
  "supplierInvoice",
  "supplierInvoiceAdjustment",
  "supplierInvoiceItem",
  "ledgerSession",
  "productRate",
  "activityLog",
  "partyPayment",
  "partyPaymentAllocation"
];

/**
 * Resolves current session context safely.
 */
async function getAuthContext() {
  try {
    const session = await getSession();
    if (session) {
      return {
        userId: session.userId || 0,
        businessId: SYSTEM_BUSINESS_ID,
      };
    }
  } catch (e) {
    // Session context not available (e.g. background job, system seed)
  }
  return {
    userId: 0,
    businessId: SYSTEM_BUSINESS_ID,
  };
}

// Extend Prisma Client to dynamically intercept database writes and inject ownership fields.
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const modelLower = model.charAt(0).toLowerCase() + model.slice(1);
        if (MODELS_WITH_OWNERSHIP.includes(modelLower)) {
          const context = await getAuthContext();
          args.data = {
            ...args.data,
            userId: args.data.userId !== undefined ? args.data.userId : context.userId,
            businessId: args.data.businessId !== undefined ? args.data.businessId : context.businessId,
          };
        }
        return query(args);
      },
      async createMany({ model, args, query }) {
        const modelLower = model.charAt(0).toLowerCase() + model.slice(1);
        if (MODELS_WITH_OWNERSHIP.includes(modelLower)) {
          const context = await getAuthContext();
          if (Array.isArray(args.data)) {
            args.data = args.data.map(item => ({
              ...item,
              userId: item.userId !== undefined ? item.userId : context.userId,
              businessId: item.businessId !== undefined ? item.businessId : context.businessId,
            }));
          } else if (args.data && Array.isArray(args.data.data)) {
            // Support createMany({ data: [...] })
            args.data.data = args.data.data.map(item => ({
              ...item,
              userId: item.userId !== undefined ? item.userId : context.userId,
              businessId: item.businessId !== undefined ? item.businessId : context.businessId,
            }));
          }
        }
        return query(args);
      },
      async update({ model, args, query }) {
        const modelLower = model.charAt(0).toLowerCase() + model.slice(1);
        if (MODELS_WITH_OWNERSHIP.includes(modelLower)) {
          const context = await getAuthContext();
          args.data = {
            ...args.data,
            userId: args.data.userId !== undefined ? args.data.userId : context.userId,
            businessId: args.data.businessId !== undefined ? args.data.businessId : context.businessId,
          };
        }
        return query(args);
      },
      async updateMany({ model, args, query }) {
        const modelLower = model.charAt(0).toLowerCase() + model.slice(1);
        if (MODELS_WITH_OWNERSHIP.includes(modelLower)) {
          const context = await getAuthContext();
          args.data = {
            ...args.data,
            userId: args.data.userId !== undefined ? args.data.userId : context.userId,
            businessId: args.data.businessId !== undefined ? args.data.businessId : context.businessId,
          };
        }
        return query(args);
      },
    },
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;
export default prisma;
