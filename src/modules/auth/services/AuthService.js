import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/UserRepository";
import { loginSchema } from "../validations/authSchema";
import { createSession, deleteSession } from "@/lib/session";

const BCRYPT_ROUNDS = 12;

export class AuthService {
  /**
   * Authenticate user with email and password.
   * On success, creates a session cookie and returns the user profile.
   */
  static async login(email, password) {
    const validated = loginSchema.parse({ email, password });

    const user = await UserRepository.getByEmail(validated.email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      throw new Error("This account has been disabled. Contact your administrator.");
    }

    const passwordMatch = await bcrypt.compare(validated.password, user.password);
    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }

    // Create session cookie
    await createSession({
      userId: user.id,
      userName: user.name || user.email,
      email: user.email,
      role: user.role,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Clear the session cookie.
   */
  static async logout() {
    await deleteSession();
  }

  /**
   * Hash a plaintext password.
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }
}
