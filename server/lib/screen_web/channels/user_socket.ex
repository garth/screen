defmodule ScreenWeb.UserSocket do
  use Phoenix.Socket

  channel "document:*", ScreenWeb.DocumentChannel
  channel "user:*", ScreenWeb.UserChannel
  channel "channel:slug:*", ScreenWeb.ChannelLookupChannel

  @impl true
  def connect(_params, socket, connect_info) do
    user_token =
      case connect_info do
        %{session: %{"user_token" => token}} -> token
        _ -> nil
      end

    if user_token do
      case Screen.Accounts.get_user_by_session_token(user_token) do
        {user, _inserted_at} -> {:ok, assign(socket, :user, user)}
        nil -> {:ok, assign(socket, :user, nil)}
      end
    else
      {:ok, assign(socket, :user, nil)}
    end
  end

  @impl true
  def id(socket) do
    if socket.assigns.user, do: "users_socket:#{socket.assigns.user.id}", else: nil
  end
end
