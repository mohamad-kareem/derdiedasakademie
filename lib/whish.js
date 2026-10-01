import "server-only";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function getWhishAccount() {
  await connectDB();
  const owner = await User.findOne({
    role: { $in: ["owner", "admin"] }, isActive: true,
    $or: [{ whishNumber: { $gt: "" } }, { whishQrKey: { $gt: "" } }],
  }).sort({ createdAt: 1 }).select("whishNumber whishQrKey").lean();
  return { number: owner?.whishNumber || "", qrKey: owner?.whishQrKey || "" };
}
