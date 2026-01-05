"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatMessagesContainer } from "./chat-messages-container";
import { ChatPromptInput } from "./chat-prompt-input";
import { DarkModeToggle } from "./dark-mode-toggle";
import type { LinkChatSession } from "@/lib/link-chat-store";
import { LinkPromptInput } from "./link-prompt-input";
import { LinkProcessingPanel } from "./link-processing-panel";

type ChatContentProps = {
	activeChat: LinkChatSession | null;
	activeChatId: string | null;
	processingStep: number;
	onStartLinkChatAction: (rawUrl: string) => { ok: true } | { ok: false; error: string };
	onSendMessageAction: (chatId: string, text: string) => void;
};

export function ChatContent({
	activeChat,
	activeChatId,
	processingStep,
	onStartLinkChatAction,
	onSendMessageAction,
}: ChatContentProps) {
	const [prompt, setPrompt] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [linkInput, setLinkInput] = useState("");
	const [linkError, setLinkError] = useState<string | null>(null);
	const [isSubmittingLink, setIsSubmittingLink] = useState(false);
	const chatContainerRef = useRef<HTMLDivElement>(null);

	const isProcessing = activeChat?.status === "processing";
	const canChat = !!activeChat && activeChat.status === "ready";

	useEffect(() => {
		// Reset local message input on chat switch.
		setPrompt("");
		setIsLoading(false);
	}, [activeChatId]);

	const title = useMemo(() => {
		if (!activeChat) return "New link chat";
		return activeChat.title || "Link chat";
	}, [activeChat]);

	const subtitle = useMemo(() => {
		if (!activeChat) return "Paste a link below to create a new chat";
		return activeChat.url;
	}, [activeChat]);

	const messages = activeChat?.messages ?? [];

	const handleChatSubmit = () => {
		if (!activeChatId) return;
		if (!prompt.trim()) return;
		if (!canChat) return;

		const text = prompt.trim();
		setPrompt("");
		setIsLoading(true);

		// Dummy delay to match current UX.
		window.setTimeout(() => {
			onSendMessageAction(activeChatId, text);
			setIsLoading(false);
		}, 450);
	};

	const handleLinkSubmit = () => {
		setLinkError(null);
		setIsSubmittingLink(true);

		const res = onStartLinkChatAction(linkInput);
		if (!res.ok) {
			setLinkError(res.error);
			setIsSubmittingLink(false);
			return;
		}
		// Route will change to /chat/[id], the chat view will take over.
		setIsSubmittingLink(false);
	};

	return (
		<main className="flex h-screen flex-col overflow-hidden">
			<header className="bg-background z-10 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b px-4">
				<div className="flex items-center gap-2">
					<SidebarTrigger className="-ml-1" />
					<div className="flex min-w-0 flex-col">
						<div className="text-foreground leading-5">
							{title}
						</div>
						<div className="text-muted-foreground max-w-[70vw] truncate text-xs leading-4">
							{subtitle}
						</div>
					</div>
				</div>
				<DarkModeToggle />
			</header>

			{!activeChat ? (
				<div className="flex flex-1 items-center justify-center px-4 py-10">
					<LinkPromptInput
						variant="center"
						value={linkInput}
						onValueChange={setLinkInput}
						onSubmit={handleLinkSubmit}
						isLoading={isSubmittingLink}
						error={linkError}
					/>
				</div>
			) : (
				<>
					<ChatMessagesContainer
						messages={messages}
						containerRef={chatContainerRef}
						topContent={
							isProcessing ? (
								<LinkProcessingPanel step={processingStep} url={activeChat.url} />
							) : null
						}
					/>

					<ChatPromptInput
						isLoading={isLoading}
						prompt={prompt}
						onPromptChange={setPrompt}
						onSubmit={handleChatSubmit}
						disabled={!canChat || isProcessing}
					/>
				</>
			)}
		</main>
	);
}
