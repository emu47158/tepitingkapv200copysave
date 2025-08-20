import React, { useState } from 'react'
import { Profile } from '../lib/supabase'
import { Sidebar } from './Sidebar'
import { Feed } from './Feed'
import { Communities } from './Communities'
import { Marketplace } from './Marketplace'
import { Profile as ProfileComponent } from './Profile'
import { MessagesPopup } from './MessagesPopup'

interface MainAppProps {
  user: any
  profile: Profile
}

export function MainApp({ user, profile }: MainAppProps) {
  const [activeTab, setActiveTab] = useState('feed')
  const [showMessages, setShowMessages] = useState(false)

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed currentUser={profile} />
      case 'communities':
        return <Communities currentUser={profile} />
      case 'marketplace':
        return <Marketplace currentUser={profile} />
      case 'profile':
        return <ProfileComponent user={user} profile={profile} />
      default:
        return <Feed currentUser={profile} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          onMessagesClick={() => setShowMessages(true)}
          profile={profile}
        />
        <main className="flex-1 ml-64">
          {renderContent()}
        </main>
      </div>

      {showMessages && (
        <MessagesPopup 
          currentUser={profile}
          onClose={() => setShowMessages(false)}
        />
      )}
    </div>
  )
}
