const {fetch} = require("node-fetch");

// Node 18+ ব্যবহার করলে নিচের লাইনটির প্রয়োজন নেই। 
// কিন্তু যদি আপনার নোড ভার্সন পুরনো হয় এবং 'fetch is not defined' এরর দেয়, তবে এটি আনকমেন্ট করুন।
// const fetch = require("node-fetch");

const HF_API = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

async function runAgent(message) {
  // ১. সিম্পল ডিসিশন মেকিং (Custom Logic)
  if (message.toLowerCase().includes("weather")) {
    return "🌤️ Dhaka weather is hot today!";
  }

  // ২. এআই কল করা
  return await callAI(message);
}

async function callAI(message) {
  try {
    const response = await fetch(HF_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `User: ${message}\nAssistant:`,
        parameters: {
          max_new_tokens: 250,
          return_full_text: false, // এটি দিলে এআই শুধু তার উত্তরটুকু পাঠাবে, আপনার ইনপুট রিপিট করবে না
        }
      }),
    });

    const data = await response.json();

    // ৩. এপিআই এরর হ্যান্ডেল করা (যেমন: মডেল লোড হতে সময় নিলে)
    if (data.error) {
      console.error("Hugging Face Error:", data.error);
      return "এআই এখন একটু ব্যস্ত আছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
    }

    // ৪. উত্তর রিটার্ন করা
    // Hugging Face সাধারণত একটি অ্যারে রিটার্ন করে [{generated_text: "..."}]
    return data[0]?.generated_text || "দুঃখিত, আমি কোনো উত্তর খুঁজে পাইনি।";

  } catch (error) {
    console.error("Agent Logic Error:", error);
    return "এআই সার্ভারের সাথে সংযোগ বিচ্ছিন্ন হয়েছে।";
  }
}

module.exports = { runAgent };