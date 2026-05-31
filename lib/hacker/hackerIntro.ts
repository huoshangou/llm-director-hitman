import type { FieldAgentId } from "../world/worldTypes";

export type OpeningRadioLine = {
  id: string;
  agent: FieldAgentId;
  text: string;
};

export function openingRadioLines(): OpeningRadioLine[] {
  return [
    {
      id: "intro_face_role",
      agent: "face",
      text: "Hacker，频道清楚。Victor 在晚宴里游移，我负责引开人、把他勾上阳台。",
    },
    {
      id: "intro_runner_role",
      agent: "runner",
      text: "我管吧台酒具、配电、栏杆；雇主只要阳台上的事故画面。",
    },
    {
      id: "intro_runner_action",
      agent: "runner",
      text: "先点地图看骇入分析，再写一句指令发送。",
    },
  ];
}
