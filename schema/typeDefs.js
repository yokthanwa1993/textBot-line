export const typeDefs = `#graphql
  type Message {
    id: String!
    text: String!
    userId: String!
    timestamp: String!
  }

  type LiffInitResponse {
    success: Boolean!
    message: String!
    liffId: String
  }

  type User {
    userId: String!
    displayName: String!
    pictureUrl: String
    statusMessage: String
  }

  type GroupSummary {
    groupId: String!
    groupName: String!
    pictureUrl: String
  }

  type RoomSummary {
    roomId: String!
  }

  type RichMenu {
    richMenuId: String!
    size: String!
    selected: Boolean!
    name: String!
    chatBarText: String!
    areas: [RichMenuArea!]!
  }

  type RichMenuArea {
    bounds: RichMenuBounds!
    action: String!
  }

  type RichMenuBounds {
    x: Int!
    y: Int!
    width: Int!
    height: Int!
  }

  type Quota {
    type: String!
    value: Int!
  }

  type MessageQuota {
    totalUsage: Int!
  }

  type Insight {
    overview: String
    messages: String
    followers: String
  }

  type SendMessageResponse {
    success: Boolean!
    message: String
    sentMessages: Int
  }

  type WebhookInfo {
    endpoint: String!
    active: Boolean!
  }

  input TextMessageInput {
    to: String!
    text: String!
  }

  input ImageMessageInput {
    to: String!
    originalContentUrl: String!
    previewImageUrl: String!
  }

  input VideoMessageInput {
    to: String!
    originalContentUrl: String!
    previewImageUrl: String!
  }

  input AudioMessageInput {
    to: String!
    originalContentUrl: String!
    duration: Int!
  }

  input LocationMessageInput {
    to: String!
    title: String!
    address: String!
    latitude: Float!
    longitude: Float!
  }

  input StickerMessageInput {
    to: String!
    packageId: String!
    stickerId: String!
  }

  input FlexMessageInput {
    to: String!
    altText: String!
    contents: String!
  }

  input QuickReplyInput {
    items: [String!]!
  }

  input RichMenuInput {
    size: String!
    selected: Boolean!
    name: String!
    chatBarText: String!
    areas: String!
  }

  type Query {
    # Messages
    messages(userId: String, limit: Int, orderBy: String, order: String): [Message!]!
    getMessageById(messageId: String!): Message
    
    # LIFF SDK
    liffInit(liffId: String!): LiffInitResponse!
    
    # User & Profile
    getUserProfile(userId: String!): User
    getGroupSummary(groupId: String!): GroupSummary
    getRoomSummary(roomId: String!): RoomSummary
    
    # Rich Menu
    getRichMenuList: [RichMenu!]!
    getUserRichMenu(userId: String!): RichMenu
    getDefaultRichMenu: RichMenu
    
    # Bot Info & Statistics
    getBotInfo: User
    getQuota: Quota
    getMessageQuota: MessageQuota
    
    # Webhook
    getWebhookInfo: WebhookInfo
    testWebhook(endpoint: String!): SendMessageResponse!
    
    # Insights (Analytics)
    getInsight(date: String!): Insight
    
    # Health check
    health: String!
  }

  type Mutation {
    # Send Messages
    sendTextMessage(input: TextMessageInput!): SendMessageResponse!
    sendImageMessage(input: ImageMessageInput!): SendMessageResponse!
    sendVideoMessage(input: VideoMessageInput!): SendMessageResponse!
    sendAudioMessage(input: AudioMessageInput!): SendMessageResponse!
    sendLocationMessage(input: LocationMessageInput!): SendMessageResponse!
    sendStickerMessage(input: StickerMessageInput!): SendMessageResponse!
    sendFlexMessage(input: FlexMessageInput!): SendMessageResponse!
    
    # Edit Text Message - ส่ง Flex Message หัว EDIT
    editTextMessage(input: TextMessageInput!): SendMessageResponse!
    
    # Add Messages to storage
    addMessage(text: String!, userId: String!): Message!
    
    # Multicast & Broadcast
    multicastMessage(to: [String!]!, text: String!): SendMessageResponse!
    broadcastMessage(text: String!): SendMessageResponse!
    
    # Reply Messages
    replyMessage(replyToken: String!, text: String!): SendMessageResponse!
    replyWithMultipleMessages(replyToken: String!, messages: [String!]!): SendMessageResponse!
    
    # Rich Menu Management
    createRichMenu(input: RichMenuInput!): SendMessageResponse!
    deleteRichMenu(richMenuId: String!): SendMessageResponse!
    setUserRichMenu(userId: String!, richMenuId: String!): SendMessageResponse!
    unlinkUserRichMenu(userId: String!): SendMessageResponse!
    setDefaultRichMenu(richMenuId: String!): SendMessageResponse!
    cancelDefaultRichMenu: SendMessageResponse!
    
    # Group & Room Management
    leaveGroup(groupId: String!): SendMessageResponse!
    leaveRoom(roomId: String!): SendMessageResponse!
    
    # Webhook Management
    setWebhookEndpoint(endpoint: String!): SendMessageResponse!

    # Edit Messages
    editMessage(messageId: String!, newText: String!, userId: String!): Message
  }
`;