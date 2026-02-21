import os

import uvicorn


def main() -> None:
    port = int(os.getenv('UROFLOW_BACKEND_PORT', '8000'))
    uvicorn.run('main:app', host='127.0.0.1', port=port, log_level='info')


if __name__ == '__main__':
    main()
