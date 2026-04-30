import { protectRoute } from "@/42go/policy";
import {
  getReaderLanguages,
  getSessionUserId,
  json,
  loadReaderData,
  parseProfilePayload,
  saveProfile,
} from "../_lib/reader";

const getProfile = async () => {
  const userId = await getSessionUserId();
  if (!userId) {
    return json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  return json(await loadReaderData(userId));
};

const updateProfile = async (req: Request) => {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return json(
        { error: "session", message: "login required" },
        { status: 401 }
      );
    }

    const parsed = await parseProfilePayload(req);

    if (!parsed.success) {
      return json(
        {
          error: "validation",
          message: "Invalid profile selection",
          issues: parsed.error.flatten().fieldErrors,
          languages: getReaderLanguages(),
        },
        { status: 400 }
      );
    }

    return json(await saveProfile(userId, parsed.data));
  } catch (error) {
    console.error("LingoCafe profile update failed", error);
    return json(
      {
        error: "profile_update_failed",
        message: "Could not save profile.",
      },
      { status: 500 }
    );
  }
};

export const GET = protectRoute(getProfile, {
  require: { feature: "api:lingocafe", session: true },
});

export const POST = protectRoute(updateProfile, {
  require: { feature: "api:lingocafe", session: true },
});
