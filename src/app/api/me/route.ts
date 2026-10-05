import { errorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth/guards";

// Identity endpoint for client-side shells; 401 for anonymous, never a guessed role.
export async function GET() {
  try {
    const user = await requireUser();
    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
