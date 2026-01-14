import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        const SITE_PASSWORD = process.env.SITE_PASSWORD;

        if (password === SITE_PASSWORD) {
            const response = NextResponse.json({ success: true });

            // Set a secure httpOnly cookie
            // Max age: 30 days
            response.cookies.set('auth_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
            });

            return response;
        }

        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
