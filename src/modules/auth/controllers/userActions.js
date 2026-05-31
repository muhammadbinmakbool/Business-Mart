"use server";

import { UserService } from "../services/UserService";
import { revalidatePath } from "next/cache";

export async function listUsersAction() {
  try {
    const users = await UserService.listUsers();
    return { success: true, users };
  } catch (error) {
    return { error: error.message || "Failed to list users" };
  }
}

export async function createUserAction(formData) {
  const data = {
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role") || "USER",
  };

  try {
    await UserService.createUser(data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to create user" };
  }
}

export async function updateUserAction(id, formData) {
  const data = {};
  const email = formData.get("email");
  const name = formData.get("name");
  const password = formData.get("password");
  const role = formData.get("role");

  if (email) data.email = email;
  if (name) data.name = name;
  if (password) data.password = password;
  if (role) data.role = role;

  try {
    await UserService.updateUser(id, data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to update user" };
  }
}

export async function disableUserAction(id) {
  try {
    await UserService.disableUser(id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to disable user" };
  }
}

export async function enableUserAction(id) {
  try {
    await UserService.enableUser(id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to enable user" };
  }
}
