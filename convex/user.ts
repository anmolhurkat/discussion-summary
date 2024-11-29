import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: { name: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    try {
      const existingUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .first();

      if (!existingUser) {
        const user = await ctx.db.insert("users", {
          name: args.name,
          userId: args.userId,
        });
        return user;
      } else {
        return;
      }
    } catch (error) {
      throw new Error("Server error");
    }
  },
});