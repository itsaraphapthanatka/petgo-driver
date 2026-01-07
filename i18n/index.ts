import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
    en: {
        translation: {
            welcome: "Welcome to Pet Transport",
<<<<<<< HEAD
            login: "PetGo",
=======
            login: "PetGo Driver",
>>>>>>> 84c5a5c (feat: Configure app as petgo-driver, update authenticated navigation, and enhance chat message deduplication logic.)
            register: "Register",
            home: "Home",
            profile: "Profile",
            activity: "Activity",
            wallet: "Wallet",
            where_to: "Where to?",
            choose_vehicle: "Choose Vehicle",
            confirm: "Confirm",
            current_location: "Current Location",
            no_location_found: "No locations found",
            enter_destination: "Enter a destination",
            pick_up: "Pick Up",
            pickup: "Pickup",
            drop_off: "Drop Off",
            confirm_booking: "Confirm Booking",
            distance: "Distance",
            pet_surcharge: "Pet Surcharge",
            total: "Total",
            service_fare: "Service Fare",
            onboarding: {
                slide1_title: "Safe Transport for your Buddy",
                slide1_subtitle: "Professional drivers trained to handle pets with care and love.",
                slide2_title: "Real-time Tracking",
                slide2_subtitle: "Watch your pet's journey live on the map for peace of mind.",
                slide3_title: "Any Pet, Any Size",
                slide3_subtitle: "From hamsters to Great Danes, we have the right vehicle for you.",
                skip: "Skip",
                next: "Next",
                get_started: "Get Started"
            },
            login_screen: {
<<<<<<< HEAD
                title: "PetGo",
=======
                title: "PetGo Driver",
>>>>>>> 84c5a5c (feat: Configure app as petgo-driver, update authenticated navigation, and enhance chat message deduplication logic.)
                subtitle: "Login to your account",
                email: "Email",
                password: "Password",
                login_as_customer: "Login as Customer",
                driver: "Driver",
                admin: "Admin",
                dont_have_account: "Don't have an account?",
                sign_up: "Sign Up",
                forgot_password: "Forgot Password",
            },
            home_screen: {
                good_morning: "Good Morning,",
                transport_safely: "Transport your pet safely",
                guest: "Guest"
            },
            select_passenger: "Select Passenger",
            how_many_people: "How many people are traveling?",
            travel_alone: "Alone",
            travel_group: "2+ People",
            max_2_pets: "Max 2 pets",
            max_1_pet: "Max 1 pet",
            select_pets: "Select Pets",
            add_new_pet: "Add New Pet",
            new_pet_details: "New Pet Details",
            pet_name: "Pet Name",
            breed: "Breed",
            weight_kg: "Weight (kg)",
            add_pet: "Add Pet",
            travel_tips_title: "Travel Tips",
            travel_tips_desc: "Pets don't need cages, but we recommend bringing a blanket and small cleaning supplies just in case!",
            limit_reached: "Limit Reached",
            alone_limit_desc: "Traveling alone: You can bring up to 2 small pets.",
            group_limit_desc: "Traveling with 2+ people: You can bring only 1 pet.",
            payment_method: "Payment Method",
            cash: "Cash",
            promptpay: "PromptPay / Transfer",
            payment_collection: "Payment Collection",
            collect_from_customer: "Collect from customer",
            paid_online: "Paid Online",
            finish_job: "Finish Job",
            journey_completed: "Journey Completed",
            amount_paid: "Total Paid",
            amount_to_pay: "Total to Pay",
            paid: "PAID",
            pending: "PENDING",
            date: "Date",
            trip_details: "Trip Details",
            back_to_home: "Back to Home",
            driver: "Driver"
        }
    },
    th: {
        translation: {
            welcome: "ยินดีต้อนรับสู่ Pet Transport",
            pickup: "ตำแหน่งของคุณ",
            onboarding: {
                slide1_title: "ขนส่งสัตว์เลี้ยงของคุณอย่างปลอดภัย",
                slide1_subtitle: "ผู้ขับขี่ที่ได้รับการฝึกอบรมเพื่อให้สัตว์เลี้ยงของคุณได้รับการดูแลอย่างดี",
                slide2_title: "ติดตามสัตว์เลี้ยงของคุณอย่างต่อเนื่อง",
                slide2_subtitle: "ดูสัตว์เลี้ยงของคุณอย่างต่อเนื่องบนแผนที่",
                slide3_title: "สัตว์เลี้ยงของคุณสามารถมีขนาดต่างๆ",
                slide3_subtitle: "จากแฮมสเตอร์ส์ถึง Great Danes, เรามีรถที่เหมาะสมสำหรับคุณ  ",
                skip: "ข้าม",
                next: "ต่อไป",
                get_started: "เริ่มต้น"
            },
            login_screen: {
                title: "เข้าสู่ระบบ",
                subtitle: "เข้าสู่ระบบบัญชีของคุณ",
                email: "อีเมล",
                password: "รหัสผ่าน",
                login_as_customer: "เข้าสู่ระบบลูกค้า",
                driver: "คนขับ",
                admin: "แอดมิน",
                dont_have_account: "ยังไม่มีบัญชี?",
                sign_up: "ลงทะเบียน",
                forgot_password: "ลืมรหัสผ่าน?",
            },
            home_screen: {
                good_morning: "สวัสดีตอนเช้า,",
                transport_safely: "ขนส่งสัตว์เลี้ยงของคุณอย่างปลอดภัย",
                guest: "แขก"
            },
            where_to: "ไปที่ไหน?",
            current_location: "ตำแหน่งปัจจุบัน",
            no_location_found: "ไม่พบสถานที่",
            enter_destination: "กรอกจุดหมายปลายทาง",
            pick_up: "จุดรับ",
            drop_off: "จุดส่ง",
            choose_vehicle: "เลือกรถ",
            confirm: "ยืนยัน",
            confirm_booking: "ยืนยันการจอง",
            distance: "ระยะทาง",
            pet_surcharge: "ค่าธรรมเนียมสัตว์เลี้ยง",
            total: "ราคารวม",
            service_fare: "ค่าบริการปกติ",
            select_passenger: "เลือกผู้โดยสาร",
            how_many_people: "เดินทางกี่คน?",
            travel_alone: "เดินทางคนเดียว",
            travel_group: "เดินทาง 2 คนขึ้นไป",
            max_2_pets: "พา สัตว์เลี้ยงเล็ก 2 ตัว ได้",
            max_1_pet: "พา สัตว์เลี้ยง 1 ตัว",
            select_pets: "เลือกสัตว์เลี้ยง",
            add_new_pet: "เพิ่มสัตว์เลี้ยง",
            new_pet_details: "รายละเอียดสัตว์เลี้ยงใหม่",
            pet_name: "ชื่อสัตว์เลี้ยง",
            breed: "สายพันธุ์",
            weight_kg: "น้ำหนัก (กิโลกรัม)",
            add_pet: "เพิ่มสัตว์เลี้ยง",
            travel_tips_title: "กฎง่าย ๆ เพื่อการเดินทางราบรื่น",
            travel_tips_desc: "สัตว์เลี้ยงไม่จำเป็นต้องใส่กรง แต่แนะนำ ผ้าห่ม + อุปกรณ์ทำความสะอาดเล็ก ๆ เผื่อสัตว์เลี้ยงเลอะ",
            limit_reached: "เกินขีดจำกัด",
            alone_limit_desc: "เดินทางคนเดียว: พา สัตว์เลี้ยงเล็ก 2 ตัว ได้",
            group_limit_desc: "เดินทาง 2 คนขึ้นไป: พา สัตว์เลี้ยง 1 ตัว",
            payment_method: "วิธีชำระเงิน",
            cash: "เงินสด",
            promptpay: "พร้อมเพย์ / โอนเงิน",
            payment_collection: "ยอดที่ต้องเก็บ",
            collect_from_customer: "เก็บเงินจากลูกค้า",
            paid_online: "จ่ายออนไลน์แล้ว",
            finish_job: "จบงาน",
            journey_completed: "การเดินทางเสร็จสิ้น",
            amount_paid: "ยอดชำระแล้ว",
            amount_to_pay: "ยอดที่ต้องชำระ",
            paid: "ชำระแล้ว",
            pending: "รอดำเนินการ",
            date: "วันที่",
            trip_details: "รายละเอียดการเดินทาง",
            back_to_home: "กลับสู่หน้าหลัก",
            driver: "คนขับ"
        }
    }
};


import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageDetectorAsyncModule } from 'i18next';

const languageDetector: LanguageDetectorAsyncModule = {
    type: 'languageDetector',
    async: true,
    detect: (callback: (lang: string) => void) => {
        AsyncStorage.getItem('user-language').then((savedLanguage) => {
            const phoneLanguage = Localization.getLocales()[0].languageCode;
            callback(savedLanguage || phoneLanguage || 'th');
        }).catch((error) => {
            console.log('Error reading language', error);
            callback('th');
        });
    },
    init: () => { },
    cacheUserLanguage: async (language: string) => {
        try {
            await AsyncStorage.setItem('user-language', language);
            console.log('Language saved:', language);
        } catch (error) {
            console.log('Error saving language', error);
        }
    },
};

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false // Handle loading manually if needed, or use Suspense
        }
    });

export default i18n;
