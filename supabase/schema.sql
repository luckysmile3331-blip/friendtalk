-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  friend_code TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Friendships table (mutual friend relationships)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
  user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT user_a_before_user_b CHECK (user_a < user_b),
  UNIQUE(user_a, user_b)
);

-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
  from_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT no_self_request CHECK (from_id != to_id),
  UNIQUE(from_id, to_id)
);

-- Friend aliases (custom names for friends)
CREATE TABLE IF NOT EXISTS friend_aliases (
  id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT no_self_alias CHECK (owner_id != friend_id),
  UNIQUE(owner_id, friend_id)
);

-- Group chats table
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
  group_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Group invites table
CREATE TABLE IF NOT EXISTS group_invites (
  id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
  group_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT no_duplicate_invite UNIQUE(group_id, invitee_id, status)
);

-- One-to-one messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT no_self_message CHECK (sender_id != receiver_id)
);

-- Group messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
  group_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_friendships_user_a ON friendships(user_a);
CREATE INDEX idx_friendships_user_b ON friendships(user_b);
CREATE INDEX idx_friend_requests_from ON friend_requests(from_id);
CREATE INDEX idx_friend_requests_to ON friend_requests(to_id);
CREATE INDEX idx_friend_aliases_owner ON friend_aliases(owner_id);
CREATE INDEX idx_friend_aliases_friend ON friend_aliases(friend_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_invites_group ON group_invites(group_id);
CREATE INDEX idx_group_invites_invitee ON group_invites(invitee_id);
CREATE INDEX idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX idx_direct_messages_receiver ON direct_messages(receiver_id);
CREATE INDEX idx_direct_messages_created ON direct_messages(created_at);
CREATE INDEX idx_group_messages_group ON group_messages(group_id);
CREATE INDEX idx_group_messages_sender ON group_messages(sender_id);
CREATE INDEX idx_group_messages_created ON group_messages(created_at);

-- RLS (Row Level Security) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: Users can view all profiles, but only edit their own
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can only update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Friendships RLS: Users can only view/manage their own friendships
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create friendships via requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Friend requests RLS: Users can only view/manage requests involving them
CREATE POLICY "Users can view friend requests involving them"
  ON friend_requests FOR SELECT
  USING (auth.uid() = from_id OR auth.uid() = to_id);

CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = from_id);

CREATE POLICY "Users can update friend requests to them"
  ON friend_requests FOR UPDATE
  USING (auth.uid() = to_id)
  WITH CHECK (auth.uid() = to_id);

CREATE POLICY "Users can delete their own friend requests"
  ON friend_requests FOR DELETE
  USING (auth.uid() = from_id OR auth.uid() = to_id);

-- Friend aliases RLS: Users can only view/manage their own aliases
CREATE POLICY "Users can view their own friend aliases"
  ON friend_aliases FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create friend aliases"
  ON friend_aliases FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own friend aliases"
  ON friend_aliases FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own friend aliases"
  ON friend_aliases FOR DELETE
  USING (auth.uid() = owner_id);

-- Group chats RLS: Users can view groups they're members of
CREATE POLICY "Users can view groups they are members of"
  ON group_chats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_chats.id
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can create group chats"
  ON group_chats FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update groups they own"
  ON group_chats FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Group members RLS
CREATE POLICY "Users can view group members of groups they're in"
  ON group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm2
    WHERE gm2.group_id = group_members.group_id
    AND gm2.user_id = auth.uid()
  ));

CREATE POLICY "Users can add members to groups"
  ON group_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_chats
    WHERE group_chats.id = group_members.group_id
    AND group_chats.owner_id = auth.uid()
  ));

CREATE POLICY "Users can remove themselves from groups"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Group invites RLS
CREATE POLICY "Users can view their own invites"
  ON group_invites FOR SELECT
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

CREATE POLICY "Users can create invites to their groups"
  ON group_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id AND EXISTS (
    SELECT 1 FROM group_chats
    WHERE group_chats.id = group_invites.group_id
    AND group_chats.owner_id = auth.uid()
  ));

CREATE POLICY "Users can respond to their own invites"
  ON group_invites FOR UPDATE
  USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

-- Direct messages RLS: Users can only view their own messages
CREATE POLICY "Users can view their own direct messages"
  ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send direct messages"
  ON direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM friendships
    WHERE (friendships.user_a = auth.uid() AND friendships.user_b = receiver_id)
    OR (friendships.user_b = auth.uid() AND friendships.user_a = receiver_id)
  ));

-- Group messages RLS
CREATE POLICY "Users can view messages in groups they're in"
  ON group_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can send messages to groups they're in"
  ON group_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
  ));

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_aliases_updated_at BEFORE UPDATE ON friend_aliases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_chats_updated_at BEFORE UPDATE ON group_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_invites_updated_at BEFORE UPDATE ON group_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
