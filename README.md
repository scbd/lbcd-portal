Linking Biological and Cultural Diversity
=========================================

https://www.cbd.int/lbcd/

[![Dependency Status](https://david-dm.org/scbd/lbcd-portal)](https://david-dm.org/scbd/lbcd-portal)

## Running

Requires Node `^22.23.4 || ^24.22.1 || >=26.12.1` and git (bower fetches the client libraries).

    npm install
    npm test
    npm start

Environment variables:

- `PORT` - HTTP port (default `2030`, `8000` in the Docker image)
- `API_URL` - upstream for the `/api/*` proxy (default `https://api.cbd.int`; use `https://api.cbddev.xyz` for dev)
