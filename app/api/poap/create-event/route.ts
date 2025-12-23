import { NextResponse } from "next/server";
import { getCachedPoapAccessToken } from "@/lib/utils/poap-auth";

/**
 * POST /api/poap/create-event
 * Creates a POAP event for a Snapshot proposal
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      image_url,
      start_date,
      end_date,
      event_url,
      virtual_event,
    } = body;

    // Validate required fields
    if (!name || !description || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: name, description, start_date, end_date" },
        { status: 400 }
      );
    }

    let accessToken: string;
    try {
      accessToken = await getCachedPoapAccessToken();
    } catch (error) {
      console.error("Error fetching POAP access token:", error);
      return NextResponse.json(
        { error: "Failed to authenticate with POAP API" },
        { status: 500 }
      );
    }

    // Create POAP event via POAP API
    // Note: This endpoint may vary based on POAP API version
    const poapEventData = {
      name,
      description,
      image_url: image_url || "",
      start_date,
      end_date,
      event_url: event_url || "",
      virtual_event: virtual_event || false,
      // Additional fields that may be required
      city: "",
      country: "",
      expiry_date: end_date,
    };

    const res = await fetch("https://api.poap.tech/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-API-Key": process.env.POAP_API_KEY ?? "",
      },
      body: JSON.stringify(poapEventData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("POAP API error:", {
        status: res.status,
        statusText: res.statusText,
        body: errorText,
      });
      return NextResponse.json(
        { error: `Failed to create POAP event: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating POAP event:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create POAP event" },
      { status: 500 }
    );
  }
}

