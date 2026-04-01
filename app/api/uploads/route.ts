import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const ALLOWED_MIME_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
]);

const MIME_EXTENSION: Record<string, string> = {
	"image/png": ".png",
	"image/jpeg": ".jpg",
	"image/webp": ".webp",
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
		}

		if (!ALLOWED_MIME_TYPES.has(file.type)) {
			return NextResponse.json(
				{ error: "Only PNG, JPG, and WEBP images are allowed." },
				{ status: 400 }
			);
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			return NextResponse.json(
				{ error: "Image size must be 5MB or less." },
				{ status: 400 }
			);
		}

		const extension =
			path.extname(file.name).toLowerCase() || MIME_EXTENSION[file.type] || ".jpg";
		const baseName = path
			.basename(file.name, extension)
			.toLowerCase()
			.replace(/[^a-z0-9-_]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 40);

		const safeName = baseName || "ev-image";
		const fileName = `${Date.now()}-${safeName}-${randomUUID()}${extension}`;

		const uploadsDir = path.join(process.cwd(), "public", "uploads");
		await mkdir(uploadsDir, { recursive: true });

		const bytes = Buffer.from(await file.arrayBuffer());
		const filePath = path.join(uploadsDir, fileName);
		await writeFile(filePath, bytes);

		return NextResponse.json({ url: `/uploads/${fileName}` }, { status: 201 });
	} catch {
		return NextResponse.json(
			{ error: "Upload failed. Please try again." },
			{ status: 500 }
		);
	}
}
