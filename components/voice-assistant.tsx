"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Zap, Code } from "lucide-react"

interface VoiceAssistantProps {
  isActive: boolean
  isMicOn: boolean
  isSpeakerOn: boolean
  onToggleVoice: (active: boolean) => void
  onToggleMic: (on: boolean) => void
  onToggleSpeaker: (on: boolean) => void
}

export default function VoiceAssistant({
  isActive,
  isMicOn,
  isSpeakerOn,
  onToggleVoice,
  onToggleMic,
  onToggleSpeaker,
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [callDuration, setCallDuration] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }
    return () => clearInterval(interval)
  }, [isActive])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const simulateListening = () => {
    if (!isMicOn) return

    setIsListening(true)
    setTranscript("How can I optimize this React component for better performance?")

    setTimeout(() => {
      setIsListening(false)
      setAiResponse("I can help you optimize your React component! Here are some key strategies...")
    }, 3000)
  }

  return (
    <div className="space-y-6">
      {/* Voice Call Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Voice Assistant
            </div>
            {isActive && (
              <Badge variant="default" className="bg-green-500">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                {formatDuration(callDuration)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isActive ? (
            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Phone className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start Voice Session</h3>
              <p className="text-muted-foreground mb-4">
                Talk to your AI assistant using natural language. Get code explanations, debugging help, and more.
              </p>
              <Button onClick={() => onToggleVoice(true)} size="lg" className="gap-2">
                <Phone className="h-4 w-4" />
                Start Voice Call
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI Avatar */}
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 relative">
                  <Zap className="h-16 w-16 text-white" />
                  {isListening && (
                    <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping"></div>
                  )}
                </div>
                <h3 className="text-lg font-semibold">AI Assistant</h3>
                <p className="text-sm text-muted-foreground">{isListening ? "Listening..." : "Ready to help"}</p>
              </div>

              {/* Transcript */}
              {transcript && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">You</span>
                      </div>
                      <p className="text-sm">{transcript}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Response */}
              {aiResponse && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Zap className="h-3 w-3 text-white" />
                      </div>
                      <p className="text-sm">{aiResponse}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <Button
                  variant={isMicOn ? "default" : "destructive"}
                  size="lg"
                  onClick={() => onToggleMic(!isMicOn)}
                  className="rounded-full w-16 h-16"
                >
                  {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => onToggleVoice(false)}
                  className="rounded-full w-16 h-16"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  variant={isSpeakerOn ? "default" : "outline"}
                  size="lg"
                  onClick={() => onToggleSpeaker(!isSpeakerOn)}
                  className="rounded-full w-16 h-16"
                >
                  {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                </Button>
              </div>

              {/* Push to Talk */}
              <div className="text-center">
                <Button
                  variant="outline"
                  size="lg"
                  onMouseDown={simulateListening}
                  className="gap-2"
                  disabled={!isMicOn}
                >
                  <Mic className="h-4 w-4" />
                  Hold to Speak
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Hold the button and speak your question</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice Features */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Code className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Code Explanation</p>
              <p className="text-xs text-muted-foreground">Ask AI to explain code verbally</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Mic className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Voice Commands</p>
              <p className="text-xs text-muted-foreground">Control your editor with voice</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Real-time Help</p>
              <p className="text-xs text-muted-foreground">Get instant coding assistance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
