# UroFlow

Urine flow simulation through the male prostatic urethra using:
- FastAPI backend (`/simulate`)
- React + Vite frontend
- A phenomenological uroflow model that estimates `Q_max` and average flow velocity from:
  - detrusor pressure (`p_det`)
  - prostate length (`length`)
  - prostate volume (`volume`)
  - IPP grade (`ipp_grade`)

## Project Structure

- `main.py`: FastAPI app and `/simulate` endpoint
- `simulation.py`: uroflow simulation model
- `frontend/`: React frontend
- `Dockerfile`, `docker-compose.yml`: containerized backend setup

## Requirements

- Python 3.11+ (local backend run)
- Node.js 18+ and npm (frontend run)
- Docker Desktop (optional, for containerized backend)
- macOS (for desktop packaging workflow)

## Standalone macOS App (Desktop)

This repo now includes a desktop shell (Electron) that launches the backend automatically.

### Run Desktop App in Development

From `frontend/`:

```bash
npm install
npm run dev:desktop
```

This starts:
- Vite renderer on `127.0.0.1:5173`
- FastAPI backend on `127.0.0.1:8000` (auto-launched by Electron)

### Build a Standalone macOS `.dmg`

1. Build the backend binary (PyInstaller) and package desktop app:

```bash
cd frontend
npm run package:mac
```

2. Output artifact:
- `frontend/dist/*.dmg`

Notes:
- Backend binary is created at `frontend/backend-bin/uroflow-backend`.
- Packaging uses `scripts/build_backend_binary.sh`.

### Fallback: Build Standalone `.app` (if DMG build is killed)

If `electron-builder` is terminated by macOS (`zsh: killed`), use the lighter packaging path:

```bash
cd frontend
npm run package:app:mac
```

Output:
- `frontend/release/UroFlow-darwin-arm64/UroFlow.app`

Optional zip for distribution:

```bash
cd frontend
npm run zip:app:mac
```

Output:
- `frontend/release/UroFlow-darwin-arm64/UroFlow.app.zip`

## Run Locally (Backend)

From project root:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:
- `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`

### 3D Job Endpoints (Phase 1)

The backend now includes asynchronous 3D job endpoints to support future true CFD/FSI workflows:

- `POST /jobs/uroflow3d`: enqueue a 3D simulation job
- `GET /jobs/{job_id}`: check job state and artifact links
- `GET /artifacts/{job_id}/field.vtk`: download generated 3D field artifact

Current phase:
- Outputs a VTK field artifact (`field.vtk`) using a proxy field model.
- This is an integration bridge for renderer/job plumbing, not a full Navier-Stokes solve yet.

## Run Locally (Frontend)

From `frontend/`:

```bash
npm install
npm run dev
```

Frontend will run on Vite's default local URL and call:
- `http://localhost:8000/simulate`

## Run with Docker (Backend)

From project root:

```bash
docker compose up --build
```

The backend will be exposed on `http://localhost:8000`.

## API Usage

Endpoint:
- `POST /simulate`

Example request:

```bash
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "p_det": 50,
    "length": 4.5,
    "volume": 40,
    "ipp_grade": 2
  }'
```

Example response:

```json
{
  "q_max": 23.67,
  "average_velocity": 218.46,
  "p_det_used": 50.0
}
```

## 3D Job API Example

Create a job:

```bash
curl -X POST http://localhost:8000/jobs/uroflow3d \
  -H "Content-Type: application/json" \
  -d '{
    "p_det": 50,
    "length": 4.5,
    "volume": 40,
    "ipp_grade": 2,
    "mesh_resolution": 28
  }'
```

Sample create response:

```json
{
  "job_id": "b04e4f2f-6383-4251-b9b1-4e11d6fb78d5",
  "status": "queued",
  "created_at": "2026-02-20T23:00:00.000000+00:00"
}
```

Then poll status:

```bash
curl http://localhost:8000/jobs/<job_id>
```

When `status` is `completed`, use `artifacts` URLs to fetch the VTK field for rendering.

## Notes

- `q_max` is reported in mL/s.
- `average_velocity` is reported in cm/s.
- This is a simplified phenomenological model, not a full CFD/FSI solver.

## License

This project is licensed under the MIT License. See `LICENSE`.
