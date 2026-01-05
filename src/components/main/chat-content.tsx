"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRef, useState } from "react";
import { ChatMessagesContainer } from "./chat-messages-container";
import { ChatPromptInput } from "./chat-prompt-input";
import { DarkModeToggle } from "./dark-mode-toggle";

const initialMessages = [
	{
		id: 1,
		role: "user" as const,
		content: "Hello! Can you help me with a coding question?",
	},
	{
		id: 2,
		role: "assistant" as const,
		content:
			"Of course! I'd be happy to help with your coding question. What would you like to know?",
	},
	{
		id: 3,
		role: "user" as const,
		content: "How do I create a responsive layout with CSS Grid?",
	},
	{
		id: 4,
		role: "assistant" as const,
		content:
			"Creating a responsive layout with CSS Grid is straightforward. Here's a basic example:\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;\n}\n```\n\nThis creates a grid where:\n- Columns automatically fit as many as possible\n- Each column is at least 250px wide\n- Columns expand to fill available space\n- There's a 1rem gap between items\n\nWould you like me to explain more about how this works?",
	},
];

export function ChatContent() {
	const [prompt, setPrompt] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [chatMessages, setChatMessages] = useState(initialMessages);
	const chatContainerRef = useRef<HTMLDivElement>(null);

	const handleSubmit = () => {
		if (!prompt.trim()) return;

		setPrompt("");
		setIsLoading(true);

		const newUserMessage = {
			id: chatMessages.length + 1,
			role: "user" as const,
			content: prompt.trim(),
		};

		setChatMessages([...chatMessages, newUserMessage]);

		setTimeout(() => {
			const assistantResponse = {
				id: chatMessages.length + 2,
				role: "assistant" as const,
				content: `This is a response to: "${prompt.trim()}"`,
			};

			setChatMessages((prev) => [...prev, assistantResponse]);
			setIsLoading(false);
		}, 1500);
	};

	return (
		<main className="flex h-screen flex-col overflow-hidden">
			<header className="bg-background z-10 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b px-4">
				<div className="flex items-center gap-2">
					<SidebarTrigger className="-ml-1" />
					<div className="text-foreground">Project roadmap discussion</div>
				</div>
				<DarkModeToggle />
			</header>

			<ChatMessagesContainer
				messages={chatMessages}
				containerRef={chatContainerRef}
			/>

			<ChatPromptInput
				isLoading={isLoading}
				prompt={prompt}
				onPromptChange={setPrompt}
				onSubmit={handleSubmit}
			/>
		</main>
	);
}
