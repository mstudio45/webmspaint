"use server";

import { auth, signOut } from "@/auth";

export async function userDiscordSignOut() {
    await signOut();
}

const allowed_users = ["1177722124035706931", "389792019360514048", "1098248637789786165", "1397965462054240349"];
export async function isUserAllowedOnDashboard(custom_user_id?: string) {
    let user_id = "1";

    if (custom_user_id) {
        user_id = custom_user_id;
    } else {
        const session = await auth();
        if (!session || !session.user) {
            return false;
        }

        user_id = session.user.id ?? "1";
    }

    return allowed_users.includes(user_id);
}
