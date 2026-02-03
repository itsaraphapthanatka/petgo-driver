import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
    en: {
        translation: {
            // General
            welcome: "Welcome to Pet Transport",
            login: "PetGo",
            register: "Register",
            home: "Home",
            profile: "Profile",
            activity: "Activity",
            wallet: "Wallet",
            where_to: "Where to?",
            choose_vehicle: "Choose Vehicle",
            confirm: "Confirm",
            continue: "Continue",
            next: "Next",
            cancel: "Cancel",
            error: "Error",
            success: "Success",
            current_location: "Current Location",
            no_location_found: "No locations found",
            enter_destination: "Enter a destination",
            pick_up: "Pick Up",
            pickup: "Pickup",
            drop_off: "Drop Off",
            dropoff: "Dropoff",
            confirm_booking: "Confirm Booking",
            distance: "Distance",
            pet_surcharge: "Pet Surcharge",
            total: "Total",
            service_fare: "Service Fare",
            loading: "Loading...",
            call: "Call",
            chat: "Chat",
            pay_now: "Pay Now",
            phone_not_available: "Phone number not available",

            // Onboarding
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

            // Login
            login_screen: {
                title: "PetGo",
                subtitle: "Login to your account",
                email: "Email",
                password: "Password",
                login_as_customer: "Login as Customer",
                login_as_driver: "Login as Driver",
                driver: "Driver",
                admin: "Admin",
                dont_have_account: "Don't have an account?",
                sign_up: "Sign Up",
                forgot_password: "Forgot Password",
            },

            // Home
            home_screen: {
                good_morning: "Good Morning,",
                transport_safely: "Transport your pet safely",
                guest: "Guest"
            },

            // Booking
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
            wallet_th: "Wallet",
            credit_card: "Credit/Debit Card",
            add_credit_card: "Add Credit/Debit Card",
            pay_at_destination_cash: "Pay at destination (Cash)",

            // Statuses/Jobs
            finding_driver: "Finding your driver...",
            connecting_nearest: "We are connecting you with the nearest {{vehicle}}",
            cancel_order: "Cancel Order",
            cancelling: "Cancelling...",
            driver_found: "Driver Found!",
            driver_arrived: "Driver Arrived!",
            heading_to_destination: "Heading to destination",
            booking_cancelled: "Booking Cancelled",
            booking_cancelled_desc: "Your booking has been cancelled.",
            cancel_booking: "Cancel Booking",

            // Driver Side
            pickup_location: "Pickup Location",
            dropoff_location: "Dropoff Location",
            job_details: "Job Details",
            accept_job: "Accept Job",
            decline_job: "Decline Job",
            driver_status: "Driver Status",
            online: "ONLINE",
            offline: "OFFLINE",
            incoming_requests: "Incoming Requests",
            no_jobs_online: "You're Online!",
            waiting_requests: "Waiting for new pet transport requests...",
            offline_desc: "Go online to start receiving pet transport requests.",
            view_details: "View Details",
            start_journey: "Start Journey",
            arrived_at_pickup: "Arrived at Pickup",
            picked_up_pet: "Picked up Pet",
            complete_job: "Complete Job",
            cancel_release_job: "Cancel/Release Job",
            cancel_release_confirm: "Are you sure you want to cancel this job? It will be released back to other drivers.",
            yes_cancel: "Yes, Cancel",
            job_released_desc: "You have released this job.",
            failed_to_cancel: "Failed to cancel job.",
            start_traveling: "Start traveling",
            complete_collect_payment: "Complete & Collect Payment",
            no: "No",
            yes: "Yes",
            passengers_label: "Passengers: {{count}}",
            you_are_offline: "You are Offline",
            loading_jobs: "Loading jobs...",
            retry: "Retry",
            driver_mode: "Driver Mode",

            // Common labels
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
            // General
            welcome: "ยินดีต้อนรับสู่ Pet Transport",
            login: "PetGo",
            register: "ลงทะเบียน",
            home: "หน้าหลัก",
            profile: "โปรไฟล์",
            activity: "กิจกรรม",
            wallet: "วอลเล็ท",
            where_to: "ไปที่ไหน?",
            choose_vehicle: "เลือกรถ",
            confirm: "ยืนยัน",
            continue: "ต่อไป",
            next: "ต่อไป",
            cancel: "ยกเลิก",
            error: "ข้อผิดพลาด",
            success: "สำเร็จ",
            current_location: "ตำแหน่งปัจจุบัน",
            no_location_found: "ไม่พบสถานที่",
            enter_destination: "กรอกจุดหมายปลายทาง",
            pick_up: "จุดรับ",
            pickup: "ตำแหน่งของคุณ",
            drop_off: "จุดส่ง",
            dropoff: "จุดส่ง",
            confirm_booking: "ยืนยันการจอง",
            distance: "ระยะทาง",
            pet_surcharge: "ค่าธรรมเนียมสัตว์เลี้ยง",
            total: "ราคารวม",
            service_fare: "ค่าบริการปกติ",
            loading: "กำลังโหลด...",
            call: "โทร",
            chat: "แชท",
            pay_now: "ชำระเงินตอนนี้",
            phone_not_available: "ไม่พบเบอร์โทรศัพท์",

            // Onboarding
            onboarding: {
                slide1_title: "ขนส่งสัตว์เลี้ยงของคุณอย่างปลอดภัย",
                slide1_subtitle: "ผู้ขับขี่ที่ได้รับการฝึกอบรมเพื่อให้สัตว์เลี้ยงของคุณได้รับการดูแลอย่างดี",
                slide2_title: "ติดตามสัตว์เลี้ยงของคุณอย่างต่อเนื่อง",
                slide2_subtitle: "ดูสัตว์เลี้ยงของคุณอย่างต่อเนื่องบนแผนที่",
                slide3_title: "สัตว์เลี้ยงของคุณสามารถมีขนาดต่างๆ",
                slide3_subtitle: "จากแฮมสเตอร์ส์ถึง Great Danes, เรามีรถที่เหมาะสมสำหรับคุณ",
                skip: "ข้าม",
                next: "ต่อไป",
                get_started: "เริ่มต้น"
            },

            // Login
            login_screen: {
                title: "เข้าสู่ระบบ",
                subtitle: "เข้าสู่ระบบบัญชีของคุณ",
                email: "อีเมล",
                password: "รหัสผ่าน",
                login_as_customer: "เข้าสู่ระบบลูกค้า",
                login_as_driver: "เข้าสู่ระบบคนขับ",
                driver: "คนขับ",
                admin: "แอดมิน",
                dont_have_account: "ยังไม่มีบัญชี?",
                sign_up: "ลงทะเบียน",
                forgot_password: "ลืมรหัสผ่าน?",
            },

            // Home
            home_screen: {
                good_morning: "สวัสดีตอนเช้า,",
                transport_safely: "ขนส่งสัตว์เลี้ยงของคุณอย่างปลอดภัย",
                guest: "แขก"
            },

            // Booking
            select_passenger: "เลือกผู้โดยสาร",
            how_many_people: "เดินทางกี่คน?",
            travel_alone: "เดินทางคนเดียว",
            travel_group: "เดินทาง 2 คนขึ้นไป",
            max_2_pets: "พาสัตว์เลี้ยงเล็ก 2 ตัว ได้",
            max_1_pet: "พาสัตว์เลี้ยง 1 ตัว",
            select_pets: "เลือกสัตว์เลี้ยง",
            add_new_pet: "เพิ่มสัตว์เลี้ยง",
            new_pet_details: "รายละเอียดสัตว์เลี้ยงใหม่",
            pet_name: "ชื่อสัตว์เลี้ยง",
            breed: "สายพันธุ์",
            weight_kg: "น้ำหนัก (กิโลกรัม)",
            add_pet: "เพิ่มสัตว์เลี้ยง",
            travel_tips_title: "กฎง่าย ๆ เพื่อการเดินทางราบรื่น",
            travel_tips_desc: "สัตว์เลี้ยงไม่จำเป็นต้องใส่กรง แต่แนะนำผ้าห่ม + อุปกรณ์ทำความสะอาดเล็ก ๆ เผื่อสัตว์เลี้ยงเลอะ",
            limit_reached: "เกินขีดจำกัด",
            alone_limit_desc: "เดินทางคนเดียว: พาสัตว์เลี้ยงเล็ก 2 ตัว ได้",
            group_limit_desc: "เดินทาง 2 คนขึ้นไป: พาสัตว์เลี้ยง 1 ตัว",
            payment_method: "วิธีชำระเงิน",
            cash: "เงินสด",
            promptpay: "พร้อมเพย์ / โอนเงิน",
            wallet_th: "วอลเล็ท",
            credit_card: "บัตรเครดิต/เดบิต",
            add_credit_card: "เพิ่มบัตรเครดิต",
            pay_at_destination_cash: "ชำระเมื่อถึงที่หมาย (เงินสด)",

            // Statuses/Jobs
            finding_driver: "กำลังหาคนขับรถ...",
            connecting_nearest: "เรากำลังเชื่อมต่อคุณกับ {{vehicle}} ที่ใกล้ที่สุด",
            cancel_order: "ยกเลิกคำสั่งซื้อ",
            cancelling: "กำลังยกเลิก...",
            driver_found: "ใจเย็น ๆ เราเจอคนขับแล้ว!",
            driver_arrived: "คนขับมาถึงแล้ว!",
            heading_to_destination: "กำลังเดินทางไปยังจุดหมาย",
            booking_cancelled: "การจองถูกยกเลิก",
            booking_cancelled_desc: "การจองของคุณถูกยกเลิกเรียบร้อยแล้ว",
            cancel_booking: "ยกเลิกการจอง",

            // Driver Side
            pickup_location: "จุดรับ",
            dropoff_location: "จุดส่ง",
            job_details: "รายละเอียดงาน",
            accept_job: "รับงาน",
            decline_job: "ปฏิเสธ",
            driver_status: "สถานะคนขับ",
            online: "เปิดรับงาน",
            offline: "ปิดรับงาน",
            incoming_requests: "งานที่เข้ามา",
            no_jobs_online: "คุณกำลังเปิดรับงาน!",
            waiting_requests: "กำลังรอรับงานใหม่...",
            offline_desc: "เปิดรับงานเพื่อเริ่มต้นรับงานขนส่งสัตว์เลี้ยง",
            view_details: "ดูรายละเอียด",
            start_journey: "เริ่มการเดินทาง",
            arrived_at_pickup: "มาถึงจุดรับแล้ว",
            picked_up_pet: "รับสัตว์เลี้ยงแล้ว",
            complete_job: "เสร็จสิ้นงาน",
            cancel_release_job: "ยกเลิก/ปล่อยงาน",
            cancel_release_confirm: "คุณแน่ใจหรือไม่ว่าต้องการยกเลิกงานนี้? งานจะถูกส่งกลับไปให้คนขับคนอื่น",
            yes_cancel: "ใช่, ยกเลิก",
            job_released_desc: "คุณได้ปล่อยงานนี้แล้ว",
            failed_to_cancel: "ยกเลิกงานไม่สำเร็จ",
            start_traveling: "เริ่มการเดินทาง",
            complete_collect_payment: "เสร็จสิ้นและเก็บเงิน",
            no: "ไม่ใช่",
            yes: "ใช่",
            passengers_label: "ผู้โดยสาร: {{count}} คน",
            you_are_offline: "คุณออฟไลน์อยู่",
            loading_jobs: "กำลังโหลดงาน...",
            retry: "ลองอีกครั้ง",
            driver_mode: "โหมดคนขับ",

            // common labels
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
