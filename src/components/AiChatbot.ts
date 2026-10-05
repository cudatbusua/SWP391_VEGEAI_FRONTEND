import type { ChatMessage } from '../types';
import { icons } from '../icons';

export function renderSimpleMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export function renderAiChatbotWidget(
  isChatOpen: boolean,
  userRole: 'guest' | 'authorized',
  chatMessages: ChatMessage[],
  guestQueriesUsed: number,
  maxGuestQueries: number
): string {
  const remainingQueries = Math.max(0, maxGuestQueries - guestQueriesUsed);
  const isLocked = userRole === 'guest' && remainingQueries <= 0;

  return `
    <div class="fixed bottom-6 right-6 z-40">
      
      <!-- Trigger Button -->
      ${!isChatOpen ? `
        <button 
          id="btn-toggle-chat"
          class="flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg transition cursor-pointer transform hover:scale-105"
        >
          <div class="relative">
            ${icons.bot}
            ${userRole === 'guest' ? `
              <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white"></span>
            ` : ''}
          </div>
          <span class="text-sm font-semibold">AI Dinh Dưỡng</span>
          ${userRole === 'guest' ? `
            <span class="text-[11px] bg-emerald-700/80 px-2 py-0.5 rounded-full font-medium">
              ${remainingQueries}/3 lượt
            </span>
          ` : ''}
        </button>
      ` : `
        <!-- Opened Chat Window -->
        <div class="w-96 max-w-[calc(100vw-2rem)] h-[540px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          
          <!-- Chat Header -->
          <div class="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                ${icons.bot}
              </div>
              <div>
                <h3 class="text-sm font-bold flex items-center gap-1.5">
                  <span>Trợ Lý Dinh Dưỡng VEGEAI</span>
                  ${icons.sparkle}
                </h3>
                <div class="text-[11px] text-gray-300">Hỏi đáp dinh dưỡng & calo chay</div>
              </div>
            </div>
            <button id="btn-close-chat" class="text-gray-400 hover:text-white transition cursor-pointer p-1">
              ${icons.close}
            </button>
          </div>

          <!-- Guest Trial Notice Banner -->
          ${userRole === 'guest' ? `
            <div class="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between text-xs text-amber-800">
              <div class="flex items-center gap-1.5">
                <span class="font-bold">⚡ Khách dùng thử:</span>
                <span>Còn <strong class="${remainingQueries <= 1 ? 'text-red-600' : 'text-amber-900'}">${remainingQueries}/${maxGuestQueries}</strong> câu hỏi</span>
              </div>
              <button id="btn-chat-signup" class="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer">
                Đăng ký mở khóa
              </button>
            </div>
          ` : `
            <div class="bg-emerald-50 border-b border-emerald-100 px-4 py-1.5 text-xs text-emerald-800 font-medium text-center">
              ✓ Thành viên chính thức: Trò chuyện không giới hạn
            </div>
          `}

          <!-- Chat Messages Body -->
          <div id="chat-messages-container" class="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            ${chatMessages.map(msg => `
              <div class="flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}">
                <div class="max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }">
                  <div>${renderSimpleMarkdown(msg.text)}</div>
                  <div class="text-[10px] mt-1.5 opacity-60 text-right">${msg.timestamp}</div>
                </div>
              </div>
            `).join('')}

            ${isLocked ? `
              <div class="bg-red-50 border border-red-100 rounded-2xl p-4 text-center my-2">
                <div class="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
                  ${icons.lock}
                </div>
                <h4 class="font-bold text-red-800 text-xs mb-1">Đã hết lượt dùng thử miễn phí!</h4>
                <p class="text-[11px] text-red-600 mb-3 leading-normal">
                  Bạn đã sử dụng hết 3 câu hỏi dành cho khách. Hãy đăng ký tài khoản để tiếp tục hỏi đáp không giới hạn và nhận thực đơn cá nhân hóa theo chỉ số BMI!
                </p>
                <button id="btn-chat-register-prompt" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs">
                  Đăng ký tài khoản ngay
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Suggested Quick Prompts (if not locked) -->
          ${!isLocked ? `
            <div class="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              <button class="quick-prompt-btn px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-700 whitespace-nowrap transition cursor-pointer" data-prompt="Gợi ý nguồn đạm chay thay thế thịt">
                🌱 Nguồn đạm chay
              </button>
              <button class="quick-prompt-btn px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-700 whitespace-nowrap transition cursor-pointer" data-prompt="Người bệnh Gout có nên ăn đậu hũ không?">
                🩺 Bệnh Gout & Đậu hũ
              </button>
              <button class="quick-prompt-btn px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-700 whitespace-nowrap transition cursor-pointer" data-prompt="Gợi ý bữa sáng chay dưới 300 kcal">
                🥗 Sáng dưới 300 kcal
              </button>
            </div>
          ` : ''}

          <!-- Chat Input Area -->
          <div class="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input 
              type="text" 
              id="chat-input"
              placeholder="${isLocked ? 'Vui lòng đăng ký để tiếp tục...' : 'Nhập câu hỏi dinh dưỡng...'}" 
              ${isLocked ? 'disabled' : ''}
              class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button 
              id="btn-send-chat" 
              ${isLocked ? 'disabled' : ''}
              class="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              ${icons.send}
            </button>
          </div>

        </div>
      `}

    </div>
  `;
}
