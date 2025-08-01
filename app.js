// apiKey: '6098f41f9d2b42d8935103354250108', // کلید WeatherAPI.com
new Vue({
    el: '#app',
    data: {
        city: '',
        weatherData: null,
        forecastData: [],
        hourlyForecast: [],
        loading: false,
        error: null,
        suggestions: [],
        apiKey: '6098f41f9d2b42d8935103354250108', // کلید WeatherAPI.com را اینجا قرار دهید
        darkMode: false,
        showInfo: false,
        currentTime: '',
        isSearchFocused: false, // اضافه کردن پرچم فوکوس جستجو
        searchTimeout: null // برای تایمر جستجو
    },
    methods: {
        // دریافت اطلاعات آب‌وهوا
        async fetchWeather() {
            if (!this.city.trim()) {
                this.error = 'لطفاً نام شهر را وارد کنید';
                return;
            }

            this.loading = true;
            this.error = null;
            this.weatherData = null;
            this.forecastData = [];
            this.hourlyForecast = [];
            
            try {
                // Encode کردن نام شهر برای پشتیبانی از فارسی
                const encodedCity = encodeURIComponent(this.city.trim());
                
                // دریافت اطلاعات فعلی
                const currentResponse = await axios.get(
                    `https://api.weatherapi.com/v1/current.json?key=${this.apiKey}&q=${encodedCity}&lang=fa`
                );
                
                this.weatherData = currentResponse.data;
                
                // دریافت پیش‌بینی 5 روزه
                const forecastResponse = await axios.get(
                    `https://api.weatherapi.com/v1/forecast.json?key=${this.apiKey}&q=${encodedCity}&days=5&lang=fa`
                );
                
                this.forecastData = forecastResponse.data.forecast.forecastday;
                
                // استخراج پیش‌بینی ساعتی
                if (forecastResponse.data.forecast.forecastday.length > 0) {
                    const hours = forecastResponse.data.forecast.forecastday[0].hour;
                    const currentHour = new Date().getHours();
                    this.hourlyForecast = hours.slice(currentHour, currentHour + 24);
                }
                
                // ذخیره در LocalStorage
                this.saveToHistory(this.city);
                
                // بستن پیشنهادات بعد از جستجو
                this.isSearchFocused = false;
                
            } catch (err) {
                console.error(err);
                this.error = 'شهر یافت نشد یا خطای شبکه رخ داد';
            } finally {
                this.loading = false;
            }
        },
        
        // دریافت آب‌وهوا بر اساس موقعیت مکانی
        async getLocationWeather() {
            if (!navigator.geolocation) {
                this.error = 'مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند';
                return;
            }
            
            this.loading = true;
            this.error = null;
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const response = await axios.get(
                            `https://api.weatherapi.com/v1/current.json?key=${this.apiKey}&q=${latitude},${longitude}&lang=fa`
                        );
                        
                        this.weatherData = response.data;
                        this.city = response.data.location.name;
                        
                        // دریافت پیش‌بینی 5 روزه
                        const forecastResponse = await axios.get(
                            `https://api.weatherapi.com/v1/forecast.json?key=${this.apiKey}&q=${latitude},${longitude}&days=5&lang=fa`
                        );
                        
                        this.forecastData = forecastResponse.data.forecast.forecastday;
                        
                        // استخراج پیش‌بینی ساعتی
                        if (forecastResponse.data.forecast.forecastday.length > 0) {
                            const hours = forecastResponse.data.forecast.forecastday[0].hour;
                            const currentHour = new Date().getHours();
                            this.hourlyForecast = hours.slice(currentHour, currentHour + 24);
                        }
                        
                    } catch (err) {
                        console.error('خطا در دریافت موقعیت جغرافیایی:', err);
                        this.error = 'خطا در دریافت اطلاعات آب‌وهوا';
                    } finally {
                        this.loading = false;
                    }
                },
                (error) => {
                    this.loading = false;
                    this.error = 'دسترسی به موقعیت مکانی ممکن نیست';
                    console.error('خطا در موقعیت مکانی:', error);
                }
            );
        },
        
        // ذخیره تاریخچه جستجو
        saveToHistory(city) {
            let history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
            if (!history.includes(city)) {
                history.unshift(city);
                if (history.length > 5) history.pop();
                localStorage.setItem('weatherHistory', JSON.stringify(history));
            }
            this.suggestions = history;
        },
        
        // بارگذاری تاریخچه جستجو
        loadHistory() {
            const history = JSON.parse(localStorage.getItem('weatherHistory') || '[]');
            this.suggestions = history;
        },
        
        // انتخاب شهر از پیشنهادات
        selectCity(city) {
            this.city = city;
            this.suggestions = [];
            this.isSearchFocused = false; // بستن پیشنهادات بعد از انتخاب
            this.fetchWeather();
        },
        
        // به‌روزرسانی پیشنهادات با تایپ کاربر
        updateSuggestions() {
            // پاک کردن تایمر قبلی
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            // تنظیم تایمر جدید برای به‌روزرسانی پیشنهادات
            this.searchTimeout = setTimeout(() => {
                if (this.city.length > 1) {
                    this.suggestions = JSON.parse(localStorage.getItem('weatherHistory') || '[]')
                        .filter(item => item.toLowerCase().includes(this.city.toLowerCase()));
                } else {
                    this.suggestions = [];
                }
            }, 300); // تاخیر 300 میلی‌ثانیه
        },
        
        // نمایش پیشنهادات
        showSuggestions() {
            this.isSearchFocused = true;
        },
        
        // مخفی کردن پیشنهادات با تاخیر
        hideSuggestions() {
            // تاخیر برای اجازه به کلیک روی پیشنهادات
            setTimeout(() => {
                this.isSearchFocused = false;
            }, 200);
        },
        
        // تغییر حالت تاریک/روشن
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('darkMode', this.darkMode);
        },
        
        // به‌روزرسانی زمان فعلی
        updateTime() {
            const now = new Date();
            this.currentTime = now.toLocaleTimeString('fa-IR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    },
    watch: {
        city() {
            this.updateSuggestions();
        }
    },
    mounted() {
        // بارگذاری تنظیمات ذخیره شده
        this.darkMode = JSON.parse(localStorage.getItem('darkMode') || 'false');
        this.loadHistory();
        
        // به‌روزرسانی زمان هر ثانیه
        this.updateTime();
        setInterval(this.updateTime, 1000);
        
        // دریافت آب‌وهوا موقعیت مکانی در اولین بار
        if (navigator.geolocation) {
            this.getLocationWeather();
        }
    }
});