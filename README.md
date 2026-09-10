# InstaTube & NetTube

Transform YouTube into **Instagram** or **Netflix** with a single click. A lightweight Chrome extension that restyles YouTube into pixel-perfect platform experiences.

---

## ✨ Features

### 📸 Instagram Mode ("InstaTube")
- **Stories Tray**: Channels and subscriptions displayed with vibrant Instagram gradient rings.
- **Classic Feed**: Centered Instagram cards (~470px) with channel avatar, verified badge, caption, and duration.
- **Double-Tap Heart**: Double-click any video image to trigger an animated Instagram heart burst and like the post!
- **Interactive Action Bar**: Like, Comment, Share (copies link to clipboard), and Bookmark/Save.
- **Live Comments**: Type a comment in the "Add a comment..." box and post it in real-time.
- **Reels Mode**: Switch to a dedicated vertical Reels feed with floating action buttons and spinning audio vinyl.
- **Right Sidebar ("Suggested for You")**: Recommended channels with interactive Follow buttons.
- **Search Drawer**: Slide-out Instagram search drawer with quick shortcuts.

### 🍿 Netflix Mode ("NetTube")
- **Hero Billboard**: Cinematic full-width featured video with background gradient fades.
- **Dynamic Rows**: "Trending Now", "From Your Subscriptions", "Popular on YouTube", and more.
- **Top 10 India / Region**: Custom numbered ranking cards.
- **Hover Previews**: Hover over any card for expanded metadata, play button, and action controls.

### 🔄 Seamless Switcher
- **Popup UI**: Open the extension popup to toggle the extension on/off or switch between Netflix & Instagram themes.
- **On-Screen Switch Button**: Switch modes directly on the page without opening the extension menu!

---

## 🚀 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Kunalkumar93/Instatube_Nettube.git
   ```
2. **Load into Google Chrome**:
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked** and select this cloned `Instatube_Nettube` folder.
3. **Enjoy**:
   - Open or refresh [YouTube](https://www.youtube.com).
   - Click the extension icon to select **Instagram** or **Netflix** mode!

---

## 🛠️ Architecture

- Built using Manifest V3 (`manifest_version: 3`).
- Pure JavaScript and modular vanilla CSS for maximum speed and zero dependencies.
- Non-destructive DOM overlay that keeps YouTube's native video player and backend operational.