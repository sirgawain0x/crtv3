import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { getCachedPoapAccessToken } from "@/lib/utils/poap-auth";
import { serverLogger } from "@/lib/utils/logger";
import { rateLimiters } from "@/lib/middleware/rateLimit";

/**
 * POST /api/poap/create-event
 * Creates a POAP event for a Snapshot proposal
 */
export async function POST(req: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  try {
    // Handle JSON parsing errors
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      serverLogger.error('Invalid JSON in request body:', jsonError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
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
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!description) missingFields.push('description');
      if (!start_date) missingFields.push('start_date');
      if (!end_date) missingFields.push('end_date');
      
      return NextResponse.json(
        { 
          error: "Missing required fields",
          missingFields,
          hint: 'All of the following fields are required: name, description, start_date, end_date'
        },
        { status: 400 }
      );
    }
    
    // Validate date formats
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { 
          error: "Invalid start_date format",
          details: "start_date must be a valid ISO 8601 date string"
        },
        { status: 400 }
      );
    }
    
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { 
          error: "Invalid end_date format",
          details: "end_date must be a valid ISO 8601 date string"
        },
        { status: 400 }
      );
    }
    
    // Validate end_date is after start_date
    if (endDate <= startDate) {
      return NextResponse.json(
        { 
          error: "Invalid date range",
          details: "end_date must be after start_date"
        },
        { status: 400 }
      );
    }
    
    // Validate image_url if provided
    if (image_url) {
      try {
        new URL(image_url);
      } catch {
        return NextResponse.json(
          { 
            error: "Invalid image_url format",
            details: "image_url must be a valid URL"
          },
          { status: 400 }
        );
      }
    }

    let accessToken: string;
    try {
      accessToken = await getCachedPoapAccessToken();
    } catch (error) {
      serverLogger.error("Error fetching POAP access token:", error);
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
      serverLogger.error("POAP API error:", {
        status: res.status,
        statusText: res.statusText,
        body: errorText,
      });
      
      // Parse error response if possible
      let errorMessage = `Failed to create POAP event: ${res.statusText}`;
      let errorDetails;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
        errorDetails = errorJson;
      } catch {
        errorDetails = errorText;
      }
      
      // Map common POAP API errors
      if (res.status === 401 || res.status === 403) {
        errorMessage = 'POAP API authentication failed. Please check your POAP_API_KEY.';
      } else if (res.status === 429) {
        errorMessage = 'POAP API rate limit exceeded. Please try again later.';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorDetails,
          status: res.status
        },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    serverLogger.error("Error creating POAP event:", error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Check for network/connection errors
      if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            error: 'Network error',
            details: 'Unable to connect to POAP API. Please check your network connection and try again.'
          },
          { status: 503 }
        );
      }
      
      // Check for authentication errors
      if (error.message.includes('authentication') || error.message.includes('unauthorized') || error.message.includes('API key')) {
        return NextResponse.json(
          { 
            error: 'POAP API authentication failed',
            details: 'Please check your POAP_API_KEY environment variable'
          },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to create POAP event",
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

