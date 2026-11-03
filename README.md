# SeatKoi – Bangladesh Railway Seat Availability Finder

SeatKoi is a Next.js-based Bangladesh Railway seat availability finder. It helps users search for trains, explore complete train routes, and check seat availability between multiple stations on a selected train route.

The application integrates with the Shohoz Railway API and provides a simplified interface for finding alternative station-to-station ticket availability.

---

# 1. Project Overview

**Project Name:** SeatKoi  
**Project Type:** Railway Seat Availability Finder  
**Framework:** Next.js  
**Language:** TypeScript  
**Runtime:** Node.js  
**Styling:** CSS / CSS Modules  
**Data Source:** Bangladesh Railway / Shohoz API

## Main Objectives

- Search trains between 2 stations.
- Display available trains for a selected journey date.
- View complete station routes for an individual train.
- Check seat availability between the starting station and every subsequent station.
- Identify alternative destinations when tickets to the original destination are unavailable.
- Display availability results progressively without waiting for all requests to finish.

---

# 2. System Requirements

Before running the project, install the following software:

| Software | Requirement |
|---|---|
| Node.js | LTS version |
| npm | Comes with Node.js |
| pnpm | Recommended package manager |
| Git | Latest stable version |
| Code Editor | Visual Studio Code |
| Browser | Latest Chrome / Edge |

Check installed versions:

```bash
node -v
npm -v
pnpm -v
git --version
```

## Recommended Environment

- Node.js LTS
- pnpm
- Visual Studio Code
- Google Chrome

---

# 3. Getting Started

## Step 1: Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
```

Navigate to the project directory:

```bash
cd seatkoi
```

## Step 2: Install Dependencies

Using pnpm:

```bash
pnpm install
```

Alternatively, using npm:

```bash
npm install
```

## Step 3: Configure Environment Variables

Create a `.env.local` file in the project root directory.

```env
# Railway API Credentials
RAILWAY_TOKEN=
RAILWAY_DEVICE_ID=
RAILWAY_DEVICE_KEY=

# User Credentials Storage Key
NEXT_PUBLIC_RAILWAY_USER_CREDENTIALS_KEY="SeatKoi_user_credentials"
```

**Important:**

- Railway credentials must be configured securely.
- Never commit `.env.local` to GitHub.
- Do not expose Railway tokens or device keys in frontend code.
- `NEXT_PUBLIC_` variables are exposed to browser-side code. Only use this prefix for non-secret configuration values, such as storage key names.

## Step 4: Start Development Server

Using pnpm:

```bash
pnpm dev
```

Using npm:

```bash
npm run dev
```

Open the application:

http://localhost:3000

## Step 5: Production Build

Create a production build:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

---

# 4. Railway API Integration

SeatKoi integrates with the Shohoz Railway API to retrieve train search results and individual train routes.

**Base API URL:**

```text
https://railspaapi.shohoz.com/v1.0/web
```

## 4.1 Train Search API

**Endpoint:**

```http
GET /bookings/search-trips-v2
```

**Full URL:**

```text
https://railspaapi.shohoz.com/v1.0/web/bookings/search-trips-v2
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|---|---|---|---|
| from_city | string | Starting station | Dhaka |
| to_city | string | Destination station | Sylhet |
| date_of_journey | string | Journey date | 10-Nov-2026 |
| seat_class | string | Requested seat class | F_SEAT |

**Example Request:**

```http
GET https://railspaapi.shohoz.com/v1.0/web/bookings/search-trips-v2?from_city=Dhaka&to_city=Sylhet&date_of_journey=10-Nov-2026&seat_class=F_SEAT
```

**Required Headers:**

```http
Accept: application/json
Authorization: Bearer YOUR_RAILWAY_TOKEN
x-device-id: YOUR_DEVICE_ID
x-device-key: YOUR_DEVICE_KEY
x-requested-with: XMLHttpRequest
Referer: https://eticket.railway.gov.bd/
```

**Purpose:**

- Search available trains between 2 stations.
- Retrieve train information.
- Retrieve seat classes and availability.
- Retrieve train IDs, trip IDs and route IDs.
- Identify the selected train using its `train_model`.

---

## 4.2 Individual Train Route API

**Endpoint:**

```http
POST /train-routes
```

**Full URL:**

```text
https://railspaapi.shohoz.com/v1.0/web/train-routes
```

**Request Headers:**

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer YOUR_RAILWAY_TOKEN
x-device-id: YOUR_DEVICE_ID
x-device-key: YOUR_DEVICE_KEY
x-requested-with: XMLHttpRequest
Referer: https://eticket.railway.gov.bd/
```

**Request Body:**

```json
{
  "model": "709",
  "departure_date_time": "2026-11-10"
}
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| model | string | Train model / train number |
| departure_date_time | string | Journey date |

**Purpose:**

- Retrieve the complete station list of a selected train.
- Retrieve station arrival and departure times.
- Retrieve halt and journey duration information.
- Identify the complete route from starting station to destination.

**Example Response Structure:**

```json
{
  "data": {
    "days": ["Fri", "Sat", "Sun", "Tue", "Wed", "Thu"],
    "routes": [
      {
        "city": "Dhaka",
        "departure_time": "06:30 am BST",
        "arrival_time": null
      },
      {
        "city": "Biman_Bandar",
        "arrival_time": "06:53 am BST",
        "departure_time": "06:58 am BST",
        "halt": "05",
        "duration": "00:23"
      },
      {
        "city": "Sylhet",
        "arrival_time": "01:00 pm BST",
        "departure_time": null
      }
    ],
    "total_duration": "06:30",
    "train_name": "PARABAT EXPRESS (709)"
  }
}
```

---

# 5. Internal Next.js Backend APIs

The application uses Next.js API Routes as a backend layer to communicate with the Railway API.

## 5.1 Train Search API

**Local Endpoint:**

```http
POST /api/search-trips
```

**Purpose:**

- Validate starting and destination station IDs.
- Validate journey dates.
- Retrieve station information from `railway-data.json`.
- Authenticate with the Railway API.
- Forward the search request to Shohoz.
- Return the Railway API response to the frontend.

**Request Body:**

```json
{
  "from_city_id": 1,
  "to_city_id": 290,
  "date_of_journey": "2026-11-10",
  "credentials": {
    "token": "YOUR_RAILWAY_TOKEN",
    "deviceId": "YOUR_DEVICE_ID",
    "deviceKey": "YOUR_DEVICE_KEY"
  }
}
```

**Note:** The `credentials` object is included when the client sends user-provided credentials. The backend must validate these values before using them.

---

## 5.2 Individual Train Route API

**Local Endpoint:**

```http
GET /api/train-route
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| model | string | Yes | Train model |
| date | string | Yes | Journey date |

**Example:**

```text
/api/train-route?model=709&date=2026-11-10
```

**Purpose:**

- Retrieve the selected train's complete route.
- Return all route stations.
- Provide arrival and departure times.
- Provide station information for availability checking.

---

# 6. Railway Station Database

**Data File:**

```text
data/railway-data.json
```

The project uses a local railway station database to identify station IDs.

**Example City Object:**

```json
{
  "city_id": 763,
  "city_name": "Abdulpur",
  "city_sequence": 0,
  "is_top_city": false,
  "is_enable_for_from": 1
}
```

**City Object Properties:**

| Property | Description |
|---|---|
| city_id | Unique station ID |
| city_name | Station name |
| city_sequence | Station sequence |
| is_top_city | Whether the station is a top city |
| is_enable_for_from | Whether the station can be used as a starting station |

## Station ID Mapping

The Railway Train Routes API returns station names but does not necessarily return `city_id`.

Therefore, the application matches route station names with `railway-data.json`.

Example:

```text
Train Route API:
Biman_Bandar

Railway Database:
Biman Bandar

Normalized Match:
biman bandar

Result:
Corresponding city_id
```

Station IDs must be resolved from the actual railway database rather than hardcoded.

---

# 7. Seat Availability Checking – Strategy A

One of the main features of SeatKoi is checking alternative station-to-station seat availability for a selected train.

## Example Scenario

A user wants to travel:

```text
Dhaka → Sylhet
```

If tickets from Dhaka to Sylhet are unavailable, the application checks alternative destinations along the same train route.

Example route:

```text
Dhaka
Biman Bandar
Bhairab Bazar
Brahmanbaria
Azampur
Nayapara
Shaistaganj
Sreemangal
Bhanugach
Kulaura
Maijgaon
Sylhet
```

## Strategy A: Fixed Starting Station

The starting station remains unchanged.

The application checks destinations in reverse route order.

Example:

| Request | From | To |
|---|---|---|
| 1 | Dhaka | Sylhet |
| 2 | Dhaka | Maijgaon |
| 3 | Dhaka | Kulaura |
| 4 | Dhaka | Bhanugach |
| 5 | Dhaka | Sreemangal |
| 6 | Dhaka | Shaistaganj |
| 7 | Dhaka | Nayapara |
| 8 | Dhaka | Azampur |
| 9 | Dhaka | Brahmanbaria |
| 10 | Dhaka | Bhairab Bazar |
| 11 | Dhaka | Biman Bandar |

## Request Processing

- The complete train route is retrieved first.
- The starting station is fixed.
- Every subsequent station becomes a destination.
- Each station combination generates an individual search request.
- Maximum 3 concurrent requests are used in the current implementation.
- Individual responses update their corresponding UI cards.
- The application does not wait for all requests before displaying results.

## Seat Availability Results

The UI should distinguish between:

| Status | Meaning |
|---|---|
| Available | Seats are available |
| Sold Out | Train found, but no online seats available |
| Not Reported | Expected train data or seat count was not returned |
| Failed | API request failed |
| Checking | Request is still processing |

**Important:** Missing train data must not automatically be interpreted as zero available seats.

---

# 8. User Session Storage

SeatKoi uses browser `sessionStorage` to maintain user information and search data.

## Storage Keys

| Storage Key | Description |
|---|---|
| SeatKoi_user_credentials | Railway authentication credentials |
| SeatKoi_user_profile | User profile information |
| SeatKoi_search_result | Original train search results |
| SeatKoi_alternative_search | Selected individual train information |

## User Credentials Structure

```json
{
  "token": "YOUR_RAILWAY_TOKEN",
  "deviceId": "YOUR_DEVICE_ID",
  "deviceKey": "YOUR_DEVICE_KEY"
}
```

## User Profile Structure

```json
{
  "display_name": "KAWSAR AHMED",
  "email": "user@example.com",
  "phone_number": "017XXXXXXXX",
  "alternative_mobile_number": null,
  "identification_type": 1,
  "identification_number": "XXXXXXXXXX",
  "postal_code": "1200",
  "address": "Bangladesh",
  "dob": "1995-01-01",
  "is_email_verified": 1,
  "is_email_verification_required": false,
  "nid_validated": 1
}
```

## Search Result Storage

The original search result is stored separately from the selected train result.

This separation allows the application to retain the original search context while displaying individual train details.

**Note:** These values are browser-session data and may be cleared when the browser session ends.

---

# 9. Main Application Requirements

## 9.1 Train Search

- Provide starting station autocomplete.
- Provide destination station autocomplete.
- Load station information from the railway database.
- Allow users to swap starting and destination stations.
- Prevent selecting the same station for both fields.
- Allow journey dates from today through the next 10 days.
- Retrieve available trains through the Railway Search API.

## 9.2 Train Search Results

- Display available trains.
- Show train name and train number.
- Show departure and arrival information.
- Show journey duration.
- Show available seat classes.
- Allow users to open an individual train details page.

## 9.3 Single Train Details

- Display the selected train's information.
- Automatically retrieve the complete train route.
- Display every station in the route.
- Display station arrival and departure times.
- Do not require the user to select individual stations.

## 9.4 Station-to-Station Availability

- Automatically check availability for every route destination.
- Keep the original starting station fixed.
- Search alternative destinations using Strategy A.
- Match the selected train using its `train_model`.
- Retrieve seat class and availability information.
- Update individual station cards as responses arrive.
- Display available, sold out, unknown and failed results separately.

## 9.5 Responsive UI

- Mobile-first responsive layout.
- Desktop, tablet and mobile compatibility.
- Clear train route visualization.
- Readable station cards.
- Individual availability indicators.
- Loading and progress indicators.
- Error and empty states.

---

# 10. Project Structure

The following is the main application structure. Additional components and files may exist in the project.

```text
seatkoi/
│
├── app/
│   ├── api/
│   │   ├── search-trips/
│   │   │   └── route.ts
│   │   │
│   │   └── train-route/
│   │       └── route.ts
│   │
│   ├── search/
│   │   ├── page.tsx
│   │   ├── SearchForm.css
│   │   │
│   │   └── results/
│   │       ├── page.tsx
│   │       │
│   │       └── train/
│   │           └── [trainId]/
│   │               ├── page.tsx
│   │               └── SingleTrain.css
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   └── search/
│       └── StationAutocomplete.tsx
│
├── data/
│   └── railway-data.json
│
├── public/
│
├── .env.local
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

---

# 11. Error Handling

The application should handle the following situations:

| Error | Expected Handling |
|---|---|
| Missing Railway credentials | Display authentication configuration error |
| Invalid station ID | Reject the request |
| Same starting and destination station | Reject the request |
| Invalid journey date | Display validation message |
| Railway API timeout | Return timeout error |
| Railway API rejection | Display upstream error |
| No train found | Display unknown / not found status |
| Zero online seats | Display sold out |
| Invalid API response | Handle safely without breaking the UI |

---

# 12. Security Considerations

- Keep Railway API credentials out of frontend source code.
- Never commit `.env.local`.
- Never log access tokens or device keys.
- Validate all incoming API request parameters.
- Use HTTPS in production.
- Apply rate limiting to backend API routes.
- Avoid exposing sensitive user profile information.
- Protect user credentials against XSS.
- Consider HttpOnly secure cookies and server-side session management for production authentication.

**Important:** Credentials passed from the browser to a Next.js API Route are still client-controlled input. They must not be trusted without validation.

---

# 13. Development Guidelines

- Use TypeScript for application logic.
- Keep API integrations inside Next.js backend routes.
- Use CSS Modules for component-specific styling where applicable.
- Keep `globals.css` limited to global styles, resets and CSS variables.
- Avoid modifying existing API functionality when making UI-only changes.
- Reuse existing station database information.
- Do not hardcode station IDs.
- Keep the original search result and selected train result separate.
- Handle asynchronous requests without blocking individual UI updates.

---

# 14. Deployment

Before deploying:

1. Install all dependencies.
2. Configure production environment variables.
3. Verify Railway API credentials.
4. Run the production build.
5. Test train search functionality.
6. Test individual train route retrieval.
7. Test station-to-station availability.
8. Verify mobile responsiveness.
9. Verify error handling and API timeout behaviour.

Build:

```bash
pnpm build
```

Start:

```bash
pnpm start
```

---

# 15. Future Improvements

Potential future enhancements:

- Additional alternative ticket search strategies.
- Multiple starting-station combinations.
- Seat availability monitoring.
- Automatic retry for temporary API failures.
- Search result caching where appropriate.
- Improved request batching and concurrency control.
- Availability notifications.
- Better API response analytics.
- Improved user session management.
- More detailed seat class comparisons.

---

# 16. Important Links

| Resource | URL |
|---|---|
| Next.js Documentation | https://nextjs.org/docs |
| TypeScript Documentation | https://www.typescriptlang.org/docs/ |
| Shohoz Railway Website | https://eticket.railway.gov.bd/ |
| Railway Train Search API | https://railspaapi.shohoz.com/v1.0/web/bookings/search-trips-v2 |
| Railway Train Routes API | https://railspaapi.shohoz.com/v1.0/web/train-routes |

---

**SeatKoi – Bangladesh Railway Seat Availability Finder**

*Making railway seat availability searching easier and more convenient.*
