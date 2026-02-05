"use client";
import {
  FaArrowRight,
  FaBan,
  FaClock,
  FaUsers,
  FaCertificate,
} from "react-icons/fa";
import Link from "next/link";
import { Badge } from "../ui/badge";

export const Card = ({
  title,
  state,
  body,
  start,
  end,
  choices,
  creator,
  identifier,
  snapshot,
  score,
  scores,
  core,
}: {
  title: string;
  state: string;
  body?: string;
  start?: string;
  end?: string;
  choices?: any[];
  creator?: string;
  identifier?: any;
  snapshot?: any;
  score?: number;
  scores?: any;
  core: boolean;
}) => {
  // Read a parameter
  const query = {
    title: title,
    end: end,
    start: start,
    body: body,
    choices: choices,
    creator: creator,
    identifier: identifier,
    snapshot: snapshot,
    scores: scores,
    score: score,
  };

  const goTo = (id: any) => {
    let url = `https://polygonscan.com/block/${id}`;
    window.open(url, "_blank");
  };

  return (
    <Link
      href={`/vote/more?title=${encodeURIComponent(
        title
      )}&end=${end}&start=${start}&body=${body}&choices=${encodeURIComponent(
        JSON.stringify(choices)
      )}&creator=${encodeURIComponent(
        creator ?? ""
      )}&identifier=${encodeURIComponent(
        identifier ?? ""
      )}&snapshot=${encodeURIComponent(
        snapshot ?? ""
      )}&scores=${encodeURIComponent(scores ?? "")}&score=${score}`}
    >
      <div className="flex cursor-pointer items-center justify-between border-t border-pink-600 p-5">
        <div>
          <div className="mb-5">
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <div>
            <h3 className="text-sm font-medium">
              {state === "closed"
                ? `Ended: ${end}`
                : state === "pending"
                  ? `Opens: ${start}`
                  : state === "active"
                    ? `Ends: ${end}`
                    : null}
            </h3>
          </div>
          <div className="flex">
            <div className="m-2 flex min-w-[30px] max-w-[40px] items-center justify-center rounded-lg p-2">
              {state === "closed" ? (
                <FaBan color={"red"} />
              ) : state === "pending" ? (
                <FaClock color={"yellow"} />
              ) : state === "active" ? (
                <FaClock color={"green"} />
              ) : null}
              <p className="ml-1">{state}</p>
            </div>
            <Badge
              className={`m-5 flex min-w-[40px] max-w-[80] items-center justify-center rounded-lg border-4 p-2 ${core ? "border-pink-600" : "border-orange-600"
                }`}
            >
              {core ? (
                <FaCertificate color={core ? "#db2777" : "#ea580c"} />
              ) : (
                <FaUsers color={core ? "#db2777" : "#ea580c"} />
              )}
              <p
                className={`ml-1 ${core ? "text-pink-600" : "text-orange-600"}`}
              >
                {core ? "core" : "community"}
              </p>
            </Badge>
          </div>
        </div>
        <div>
          <p>{""}</p>
        </div>
        <div>
          <FaArrowRight />
        </div>
      </div>
    </Link>
  );
};
