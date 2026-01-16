# MyVibes Bus

A modern, high-performance Progressive Web App (PWA) for real-time bus tracking and journey planning. Built with Next.js and optimized for a premium user experience.

## Features

- **Real-time Tracking**: Live bus positions using Realtime GTFS data.
- **Modern UI**: Sleek, responsive design powered by Tailwind CSS v4 and Framer Motion.
- **Interactive Maps**: Seamless mapping experience with Leaflet.
- **PWA Ready**: Installable on devices for a native app-like experience.

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Maps**: [Leaflet](https://leafletjs.com/) & React Leaflet
- **Icons**: Lucide React
- **Data Processing**: GTFS Realtime Bindings, Protobufjs

## Getting Started

1. **Install dependencies:**

```bash
npm install
```

2. **Generate GTFS Data:**

This project relies on GTFS data. Make sure to run the generation script before starting:

```bash
npm run generate-gtfs
```

3. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Looking for Contributors

We are actively looking for contributors to help build the future of public transport tracking. Whether you are a designer, developer, or enthusiastic about public transport, your help is welcome.

### Pending Tasks

We are currently focusing on the following areas:

- **Alert System (Distance Estimation)**: Implement intelligent alerts based on the estimated distance of the bus from the user or stop.
- **Notification Alert System**: Architect a more reliable notification system to ensure users never miss their bus.

## Acknowledgments

- **Data Source**: This project uses open data from [data.gov.my](https://data.gov.my/) for GTFS static and realtime information.

## License

This project is licensed under the MIT License.
