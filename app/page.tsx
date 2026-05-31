import { redirect } from "next/navigation";

/** 玩家默认入口：首页直接进入正式版 */
export default function HomePage() {
  redirect("/play/");
}
