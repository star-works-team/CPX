// Add loader styles
document.head.insertAdjacentHTML(
  "beforeend",
  `
  <style>
    .loader-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      transition: opacity 0.3s ease-out;
    }

    .loader-spinner {
      width: 140px;
      height: 140px;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: bounce 1s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
    }

    .loader-spinner img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    body.loading {
      overflow: hidden;
    }
  </style>
`
);

// Create loader element
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <div id="loader" class="loader-container">
    <div class="loader-spinner">
      <img src="./assets/img/orangeLogoIcon.png" alt="" />
    </div>
  </div>
`
);

const languageHandler = {
  portugueseCountries: [
    "PT",
    "BR",
    "AO",
    "MZ",
    "CV",
    "GW",
    "ST",
    "GQ",
    "TL",
    "MO",
  ],

  showLoader() {
    document.body.classList.add("loading");
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.display = "flex";
      loader.style.opacity = "1";
    }
  },

  hideLoader() {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.opacity = "0";
      document.body.classList.remove("loading");
      setTimeout(() => {
        loader.style.display = "none";
      }, 300);
    }
  },

  async detectUserCountry() {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 0,
        });
      });

      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch country data");
      }

      const data = await response.json();
      return data.countryCode;
    } catch (error) {
      console.error("Error detecting country:", error);
      return null;
    }
  },

  async loadBilingualContent() {
    try {
      const response = await fetch("/content.json");
      if (!response.ok) {
        throw new Error("Failed to fetch content data");
      }

      const content = await response.json();

      document.querySelectorAll("[data-content-key]").forEach((element) => {
        const key = element.getAttribute("data-content-key");
        if (content[key]) {
          element.setAttribute("data-en", content[key].en);
          element.setAttribute("data-pt", content[key].pt);
        }
      });
    } catch (error) {
      console.error("Error loading bilingual content:", error);
      throw error;
    }
  },

  updateLanguageUI(isPortuguese) {
    const language = isPortuguese ? "Português" : "English";
    document.querySelectorAll(".language-display").forEach((element) => {
      element.textContent = language;
    });
  },

  saveToHistory(page, language, timestamp) {
    try {
      const history = JSON.parse(
        localStorage.getItem("languageHistory") || "[]"
      );

      history.push({
        page,
        language,
        timestamp,
        countryCode: localStorage.getItem("userCountry") || "unknown",
      });

      if (history.length > 10) {
        history.shift();
      }

      localStorage.setItem("languageHistory", JSON.stringify(history));
    } catch (error) {
      console.error("Error saving history:", error);
    }
  },

  async setDefaultPage() {
    if (window.location.pathname === "/" || window.location.pathname === "") {
      try {
        const countryCode = await this.detectUserCountry();
        if (!countryCode) {
          throw new Error("Could not detect country");
        }

        localStorage.setItem("userCountry", countryCode);
        const isPortugueseCountry =
          this.portugueseCountries.includes(countryCode);

        const defaultPage = isPortugueseCountry
          ? "index.html"
          : "homepage.html";
        const defaultLanguage = isPortugueseCountry ? "pt" : "en";

        this.saveToHistory(
          defaultPage,
          defaultLanguage,
          new Date().toISOString()
        );

        // Keep loader visible during redirect
        window.location.href = isPortugueseCountry
          ? "/index.html"
          : "/homepage.html";
        return true;
      } catch (error) {
        console.error("Error setting default page:", error);
        this.saveToHistory("homepage.html", "en", new Date().toISOString());
        window.location.href = "/homepage.html";
        return true;
      }
    }
    return false;
  },

  getCurrentPage() {
    const path = window.location.pathname;
    return path.split("/").pop() || "index.html";
  },

  updateContent(isPortuguese) {
    this.showLoader();

    const lang = isPortuguese ? "pt" : "en";
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-content-key]").forEach((element) => {
      element.textContent = element.getAttribute(`data-${lang}`);
    });

    this.updateLanguageUI(isPortuguese);
    localStorage.setItem("preferredLanguage", lang);

    const currentPath = window.location.pathname;
    if (isPortuguese && currentPath === "/homepage.html") {
      this.saveToHistory("index.html", "pt", new Date().toISOString());
      window.location.href = "/index.html";
    } else if (!isPortuguese && currentPath === "/index.html") {
      this.saveToHistory("homepage.html", "en", new Date().toISOString());
      window.location.href = "/homepage.html";
    } else {
      this.saveToHistory(this.getCurrentPage(), lang, new Date().toISOString());
      // Always show loader for exactly 3 seconds
      setTimeout(() => {
        this.hideLoader();
      }, 3000);
    }
  },

  getHistory() {
    try {
      return JSON.parse(localStorage.getItem("languageHistory") || "[]");
    } catch (error) {
      console.error("Error getting history:", error);
      return [];
    }
  },

  async init() {
    this.showLoader();

    try {
      // Create a promise that resolves after 3 seconds
      const threeSecondTimer = new Promise((resolve) =>
        setTimeout(resolve, 3000)
      );

      // Load content while timer runs
      const loadingTasks = [
        threeSecondTimer, // Always wait 3 seconds
        (async () => {
          const isRedirecting = await this.setDefaultPage();
          if (!isRedirecting) {
            await this.loadBilingualContent();
          }
          return isRedirecting;
        })(),
      ];

      // Wait for both the timer and content loading
      const [, isRedirecting] = await Promise.all(loadingTasks);

      // Only hide loader if we're not redirecting
      if (!isRedirecting) {
        this.hideLoader();
      }
    } catch (error) {
      console.error("Initialization error:", error);
      // Still wait for full 3 seconds before hiding on error
      await new Promise((resolve) => setTimeout(resolve, 3000));
      this.hideLoader();
    }
  },
};

// Initialize based on document ready state
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    languageHandler.init();
  });
} else {
  languageHandler.init();
}
