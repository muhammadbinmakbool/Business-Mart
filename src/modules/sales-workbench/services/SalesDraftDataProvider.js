import { prisma } from "@/lib/prisma";

export class SalesDraftDataProvider {
  /**
   * Fetch all active unbilled SalesTrack records.
   */
  static async fetchUnbilledTracks(buyerId = null) {
    const whereClause = {
      isBilled: false,
      isDeleted: false
    };
    if (buyerId) {
      whereClause.buyerId = parseInt(buyerId);
    }
    return await prisma.salesTrack.findMany({
      where: whereClause,
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            primaryUnit: true,
            category: true
          }
        },
        intakeTransaction: {
          select: {
            id: true,
            intakeNumber: true,
            grossWeight: true,
            remainingWeight: true,
            unit: true,
            rateUnit: true,
            party: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  /**
   * Fetch all active arrivals (Intakes) awaiting mapping.
   */
  static async fetchActiveIntakes() {
    return await prisma.intakeTransaction.findMany({
      where: {
        isDeleted: false,
        status: {
          in: ["PENDING", "PARTIAL"]
        },
        remainingWeight: {
          gt: 0
        }
      },
      include: {
        party: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            primaryUnit: true,
            category: true
          }
        }
      },
      orderBy: {
        entryDate: "desc"
      }
    });
  }

  static async fetchRecentSales(buyerId = null, daysLimit = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit);

    const whereClause = {
      sale: {
        isDeleted: false,
        status: {
          not: "CANCELLED"
        },
        createdAt: {
          gte: cutoffDate
        }
      },
      salesTracks: {
        none: {
          type: "INTAKE_SALE"
        }
      }
    };

    if (buyerId) {
      whereClause.sale.partyId = parseInt(buyerId);
    }

    // Fetch sale items that do not have an intake-linked SalesTrack
    return await prisma.saleItem.findMany({
      where: whereClause,
      include: {
        sale: {
          select: {
            id: true,
            partyId: true,
            party: {
              select: {
                id: true,
                name: true
              }
            },
            createdAt: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            primaryUnit: true,
            category: true
          }
        }
      },
      orderBy: {
        id: "desc"
      }
    });
  }

  /**
   * Fetch recent finalized sale transactions for the activity monitor.
   */
  static async fetchRecentFinalizedSales(limit = 20) {
    return await prisma.saleTransaction.findMany({
      where: {
        isDeleted: false,
        status: {
          not: "CANCELLED"
        }
      },
      include: {
        party: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true
              }
            },
            salesTracks: {
              where: {
                isDeleted: false
              },
              include: {
                intakeTransaction: {
                  select: {
                    intakeNumber: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });
  }
}
