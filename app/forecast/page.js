import { redirect } from "next/navigation";

/** Forecast v1 beta moved to admin-only. */
export default function ForecastRedirect() {
  redirect("/admin/forecast");
}
