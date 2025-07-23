export class FlexMessageTemplates {
  // Format date to DD/MM/YY HH:MM
  static formatTimestamp(timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  static createTextResultFlex(userMessage, userId, timestamp, messageId) {
    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "TEXT", weight: "bold", size: "lg", color: "#FFFFFF", align: "center" }
        ],
        backgroundColor: "#27AE60",
        paddingAll: "md"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "lg",
        contents: [
          { type: "box", layout: "horizontal", contents: [
              { type: "text", text: "📊 สถานะ:", size: "sm", color: "#666666", flex: 2 },
              { type: "text", text: "สำเร็จ ✅", size: "sm", color: "#27AE60", flex: 3, weight: "bold" }
            ]
          },
          { type: "separator", margin: "lg" },
          { type: "text", text: "📋 ข้อความที่ได้รับ:", size: "sm", color: "#666666", margin: "lg" },
          { type: "box", layout: "vertical", contents: [
              { type: "text", text: userMessage || "ไม่มีข้อความ", size: "md", color: "#333333", wrap: true, align: "center" }
            ],
            backgroundColor: "#F5F5F5",
            cornerRadius: "8px",
            paddingAll: "md",
            margin: "sm"
          },
          { type: "separator", margin: "lg" },
          { type: "box", layout: "horizontal", contents: [
              { type: "text", text: "🕒 เวลา:", size: "sm", color: "#666666", flex: 2 },
              { type: "text", text: this.formatTimestamp(timestamp), size: "sm", color: "#333333", flex: 3 }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          { type: "button", action: { type: "uri", label: "📝 EDIT", uri: messageId && userId
                ? `https://liff.line.me/2007783990-0Y48Q7rB?message=${encodeURIComponent(userMessage || '')}&userId=${encodeURIComponent(userId)}&messageId=${encodeURIComponent(messageId)}`
                : "https://liff.line.me/2007783990-0Y48Q7rB" }, style: "primary", color: "#E74C3C", height: "sm", flex: 1 },
          { type: "button", action: { type: "uri", label: "📋 LIST", uri: "https://liff.line.me/2007783990-rbm2POM6" }, style: "primary", color: "#000000", height: "sm", flex: 1 }
        ],
        paddingAll: "md"
      }
    };
  }

  static createEditResultFlex(userMessage, userId, timestamp, messageId) {
    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { 
            type: "text", 
            text: "EDIT", 
            weight: "bold", 
            size: "lg", 
            color: "#FFFFFF", 
            align: "center" 
          }
        ],
        backgroundColor: "#F39C12",
        paddingAll: "md"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "lg",
        contents: [
          {
            type: "box", 
            layout: "horizontal", 
            contents: [
              { type: "text", text: "📊 สถานะ:", size: "sm", color: "#666666", flex: 2 },
              { type: "text", text: "แก้ไขสำเร็จ ✅", size: "sm", color: "#27AE60", flex: 3, weight: "bold" }
            ]
          },
          { type: "separator", margin: "lg" },
          { type: "text", text: "📋 ข้อความที่ได้รับ:", size: "sm", color: "#666666", margin: "lg" },
          {
            type: "box", 
            layout: "vertical", 
            contents: [
              { type: "text", text: userMessage || "ไม่มีข้อความ", size: "md", color: "#333333", wrap: true, align: "center" }
            ],
            backgroundColor: "#F5F5F5",
            cornerRadius: "8px",
            paddingAll: "md",
            margin: "sm"
          },
          { type: "separator", margin: "lg" },
          {
            type: "box", 
            layout: "horizontal", 
            contents: [
              { type: "text", text: "🕒 เวลา:", size: "sm", color: "#666666", flex: 2 },
              { type: "text", text: this.formatTimestamp(timestamp), size: "sm", color: "#333333", flex: 3 }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          { type: "button", action: { type: "uri", label: "📝 EDIT", uri: messageId && userId
                ? `https://liff.line.me/2007783990-0Y48Q7rB?message=${encodeURIComponent(userMessage || '')}&userId=${encodeURIComponent(userId)}&messageId=${encodeURIComponent(messageId)}`
                : "https://liff.line.me/2007783990-0Y48Q7rB" }, style: "primary", color: "#E74C3C", height: "sm", flex: 1 },
          { type: "button", action: { type: "uri", label: "📋 LIST", uri: "https://liff.line.me/2007783990-rbm2POM6" }, style: "primary", color: "#000000", height: "sm", flex: 1 }
        ],
        paddingAll: "md"
      }
    };
  }

  static createLiffMessageFlex(userMessage, userId, timestamp, messageId) {
    return this.createTextResultFlex(userMessage, userId, timestamp, messageId);
  }

  static createOCRResultFlex(ocrText, messageId = null, userId = null, imageUrl = null) {
    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "OCR", weight: "bold", size: "lg", color: "#FFFFFF", align: "center" }
        ],
        backgroundColor: "#3498DB",
        paddingAll: "md"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "lg",
        contents: [
          { type: "box", layout: "horizontal", contents: [
              { type: "text", text: "📊 สถานะ:", size: "sm", color: "#666666", flex: 2 },
              { type: "text", text: "สำเร็จ ✅", size: "sm", color: "#27AE60", flex: 3, weight: "bold" }
            ]
          },
          { type: "separator", margin: "lg" },
          { type: "text", text: "📋 ข้อความที่อ่านได้:", size: "sm", color: "#666666", margin: "lg" },
          { type: "box", layout: "vertical", contents: [
              { type: "text", text: ocrText || "ไม่สามารถอ่านข้อความได้", size: "md", color: "#333333", wrap: true, align: "center" }
            ],
            backgroundColor: "#F5F5F5",
            cornerRadius: "8px",
            paddingAll: "md",
            margin: "sm"
          },
          { type: "separator", margin: "lg" },
          { type: "box", layout: "horizontal", contents: [
              { type: "text", text: "🕒 เวลา:", size: "sm", color: "#666666", flex: 2 },
              { type: "text", text: this.formatTimestamp(), size: "sm", color: "#333333", flex: 3 }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          { type: "button", action: { type: "uri", label: "📝 EDIT", uri: messageId && userId
                ? `https://liff.line.me/2007783990-0Y48Q7rB?message=${encodeURIComponent(ocrText || '')}&userId=${encodeURIComponent(userId)}&messageId=${encodeURIComponent(messageId)}`
                : "https://liff.line.me/2007783990-0Y48Q7rB" }, style: "primary", color: "#E74C3C", height: "sm", flex: 1 },
          { type: "button", action: { type: "uri", label: "📋 LIST", uri: "https://liff.line.me/2007783990-rbm2POM6" }, style: "primary", color: "#000000", height: "sm", flex: 1 }
        ],
        paddingAll: "md"
      }
    };
  }
}
