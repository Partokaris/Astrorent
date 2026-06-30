# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Cloudinary Image Uploads

AstroRent stores uploaded property and profile images in Cloudinary instead of saving files on the Flask server.

1. Create a Cloudinary account at https://cloudinary.com.
2. Open the Cloudinary dashboard and copy the Cloud name, API Key, and API Secret.
3. Configure `Backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=knaanchg
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. Install backend dependencies:

```bash
cd Backend
venv\Scripts\python.exe -m pip install -r requirements.txt
```

Uploads now go through Flask endpoints such as `/api/uploads` for property images and `/api/users/profile-picture` for profile pictures. The backend validates image files, rejects empty or non-image uploads, uploads accepted files to Cloudinary folders such as `projects/` and `profile_pictures/`, and stores the returned secure HTTPS URL in the database. When images are replaced or listings are deleted, the backend attempts to remove the old Cloudinary assets as well.
