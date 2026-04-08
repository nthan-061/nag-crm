import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function okResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(error: unknown, context: string): NextResponse {
  if (error instanceof ZodError) {
    return errorResponse("Dados invalidos", 400);
  }
  console.error(`${context} failed`, error);
  return errorResponse("Erro interno", 500);
}
