import { NextResponse } from 'next/server';

export function ok(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created(data) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function err(message, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}

export function notFound(msg = 'Not found') {
  return NextResponse.json({ success: false, error: msg }, { status: 404 });
}

export function serverError(e) {
  console.error('[SERVER ERROR]', e);
  return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
}
